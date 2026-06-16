import { defineContentScript } from "wxt/utils/define-content-script";
import { detectSensitiveText, evaluateDlpPolicy, type DetectionResult } from "@ai-mae-check/core";
import { createLlmContextAnalyzer, isWebGpuAvailable, WEBGPU_UNAVAILABLE_MESSAGE } from "@ai-mae-check/llm";
import { adapterForHostname } from "../src/content/adapters";
import { shouldOfferContextCheck } from "../src/content/dom/contextHints";
import { installFileInterceptor } from "../src/content/dom/fileInterceptor";
import { evaluatePasteGuard } from "../src/content/dom/pasteGuard";
import { installSendInterceptor } from "../src/content/dom/sendInterceptor";
import { readEditableText } from "../src/content/dom/editorLocator";
import { captureCurrentRange, findEditableTarget, insertTextAtTarget, type EditableTarget } from "../src/lib/dom";
import { DEFAULT_SETTINGS, disabledRuleIds, isSiteEnabled, loadSettings, normalizeSettings, SETTINGS_KEY, type AiMaeCheckSettings } from "../src/lib/settings";
import { getLlmWorkerUrl } from "../src/lib/llmWorkerUrl";
import { targetMatches } from "../src/lib/sites";
import { showPasteReviewModal } from "../src/lib/modal";
import { showSendConfirmModal, type MinimizeResult, type SendConfirmModalOptions } from "../src/ui/confirmModal";
import { mountRiskBadge, type RiskBadgeController } from "../src/ui/riskBadge";

export default defineContentScript({
  matches: targetMatches,
  runAt: "document_start",
  main() {
    let settings: AiMaeCheckSettings = DEFAULT_SETTINGS;
    let activeTarget: EditableTarget | null = null;
    let badgeTimer: number | null = null;
    const riskBadge = mountRiskBadge();

    const scheduleRiskBadgeUpdate = (target: EditableTarget | null) => {
      activeTarget = target;

      if (badgeTimer !== null) {
        window.clearTimeout(badgeTimer);
      }

      badgeTimer = window.setTimeout(() => {
        updateRiskBadge(target, settings, riskBadge);
      }, 220);
    };

    void loadSettings().then((loadedSettings) => {
      settings = loadedSettings;
      scheduleRiskBadgeUpdate(activeTarget);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SETTINGS_KEY]) {
        return;
      }

      settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
      scheduleRiskBadgeUpdate(activeTarget);
    });

    document.addEventListener(
      "input",
      (event) => {
        scheduleRiskBadgeUpdate(findEditableTarget(event.target));
      },
      true
    );

    document.addEventListener(
      "focusin",
      (event) => {
        scheduleRiskBadgeUpdate(findEditableTarget(event.target));
      },
      true
    );

    document.addEventListener(
      "focusout",
      () => {
        window.setTimeout(() => {
          const nextTarget = findEditableTarget(document.activeElement);
          if (!nextTarget) {
            activeTarget = null;
            riskBadge.update(null);
          }
        }, 120);
      },
      true
    );

    document.addEventListener(
      "paste",
      (event) => {
        void handlePaste(event, settings);
      },
      true
    );

    installFileInterceptor({
      isEnabled: () => settings.enabled && isSiteEnabled(settings, window.location.hostname),
      disabledRuleIds: () => disabledRuleIds(settings)
    });

    const adapter = adapterForHostname(window.location.hostname);
    if (adapter) {
      installSendInterceptor({
        adapter,
        isEnabled: () => settings.enabled && isSiteEnabled(settings, window.location.hostname),
        prepareReview: (inputText) => {
          const detection = createDetection(inputText, settings);
          const policy = evaluateDlpPolicy(detection.findings);

          if (detection.findings.length === 0 || policy.action === "allow") {
            return null;
          }

          return {
            inputText,
            detection
          };
        },
        review: async ({ inputText, detection }) => {
          const confirmOptions: SendConfirmModalOptions = {
            inputText,
            detection
          };
          const onMinimize = createMinimizeRunner(inputText, detection, settings);
          if (onMinimize) {
            confirmOptions.onMinimize = onMinimize;
          }

          const decision = await showSendConfirmModal(confirmOptions);

          if (decision.type === "submit") {
            return {
              type: "replaceAndSubmit",
              text: decision.text
            };
          }

          return { type: "cancel" };
        }
      });
    }
  }
});

function createDetection(inputText: string, settings: AiMaeCheckSettings): DetectionResult {
  return detectSensitiveText(inputText, {
    disabledRuleIds: disabledRuleIds(settings)
  });
}

function createMinimizeRunner(
  inputText: string,
  detection: DetectionResult,
  settings: AiMaeCheckSettings
): ((onProgress: (message: string) => void) => Promise<MinimizeResult>) | undefined {
  if (!settings.llm.enabled) {
    return undefined;
  }

  return async (onProgress) => {
    if (!isWebGpuAvailable()) {
      return {
        blocked: true,
        error: WEBGPU_UNAVAILABLE_MESSAGE
      };
    }

    const analyzer = createLlmContextAnalyzer({
      modelId: settings.llm.modelId,
      workerUrl: await getLlmWorkerUrl()
    });

    try {
      const result = await analyzer.analyzeSanitize(inputText, {
        existingFindings: detection.findings,
        mode: "minimize",
        onProgress: (progress) => {
          onProgress(progress.message);
        }
      });

      if (result.error) {
        return {
          blocked: true,
          error: result.error
        };
      }

      if (result.block) {
        return {
          blocked: true,
          message: "Minimize後も高リスク情報が残っている可能性があります。MaskまたはGeneralizeを選んでください。"
        };
      }

      return {
        text: result.safePrompt,
        message: result.userVisibleExplanation
      };
    } finally {
      analyzer.dispose();
    }
  };
}

function updateRiskBadge(target: EditableTarget | null, settings: AiMaeCheckSettings, riskBadge: RiskBadgeController): void {
  if (!target || !settings.enabled || !isSiteEnabled(settings, window.location.hostname) || !document.contains(target)) {
    riskBadge.update(null);
    return;
  }

  const inputText = readEditableText(target);
  if (inputText.trim().length === 0) {
    riskBadge.update({
      total: 0,
      level: "safe",
      secretGuard: false
    });
    return;
  }

  const detection = createDetection(inputText, settings);
  const policy = evaluateDlpPolicy(detection.findings);
  riskBadge.update({
    total: detection.findings.length,
    level: policy.risk.level,
    secretGuard: policy.risk.secretGuard
  });
}

async function handlePaste(event: ClipboardEvent, settings: AiMaeCheckSettings): Promise<void> {
  if (!settings.enabled || !isSiteEnabled(settings, window.location.hostname)) {
    return;
  }

  const target = findEditableTarget(event.target);
  if (!target) {
    return;
  }

  const pastedText = event.clipboardData?.getData("text/plain") ?? "";
  if (pastedText.length === 0) {
    return;
  }

  const guard = evaluatePasteGuard(pastedText, {
    disabledRuleIds: disabledRuleIds(settings)
  });

  if (guard.action === "allow") {
    if (!settings.llm.enabled || !shouldOfferContextCheck(pastedText)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const savedRange = captureCurrentRange(target);
    const decision = await showPasteReviewModal({
      inputText: pastedText,
      detection: guard.detection,
      settings,
      mode: "context_check"
    });

    if (decision.type === "insert") {
      insertTextAtTarget(target, decision.text, savedRange);
    }

    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const savedRange = captureCurrentRange(target);
  const decision = await showPasteReviewModal({
    inputText: pastedText,
    detection: guard.detection,
    settings,
    mode: "paste_guard"
  });

  if (decision.type === "insert") {
    insertTextAtTarget(target, decision.text, savedRange);
  }
}
