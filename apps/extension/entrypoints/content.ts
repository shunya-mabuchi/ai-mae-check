import { defineContentScript } from "wxt/utils/define-content-script";
import { detectSensitiveText, evaluateDlpPolicy, type DetectionResult, type DetectorRule } from "@ai-mae-check/core";
import { classifyLlmError } from "@ai-mae-check/llm";
import { adapterForHostname } from "../src/content/adapters";
import { shouldOfferContextCheck } from "../src/content/dom/contextHints";
import { installFileInterceptor } from "../src/content/dom/fileInterceptor";
import { evaluatePasteGuard } from "../src/content/dom/pasteGuard";
import { installSendInterceptor } from "../src/content/dom/sendInterceptor";
import { captureCurrentRange, findEditableTarget, insertTextAtTarget } from "../src/lib/dom";
import { DEFAULT_SETTINGS, disabledRuleIds, isSiteEnabled, loadSettings, normalizeSettings, SETTINGS_KEY, type AiMaeCheckSettings } from "../src/lib/settings";
import { analyzeSanitizeWithBridge } from "../src/lib/llmBridgeClient";
import { loadVerifiedRemoteRules } from "../src/lib/remoteRuleDelivery";
import { targetMatches } from "../src/lib/sites";
import { showPasteReviewModal } from "../src/lib/modal";
import { showSendConfirmModal, type MinimizeResult, type SendConfirmModalOptions } from "../src/ui/confirmModal";

export default defineContentScript({
  matches: targetMatches,
  runAt: "document_start",
  main() {
    let settings: AiMaeCheckSettings = DEFAULT_SETTINGS;
    let remoteRules: DetectorRule[] = [];

    const refreshRemoteRules = async () => {
      const result = await loadVerifiedRemoteRules();
      remoteRules = result.status === "verified" ? result.rules : [];
    };

    void loadSettings().then((loadedSettings) => {
      settings = loadedSettings;
      void refreshRemoteRules();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SETTINGS_KEY]) {
        return;
      }

      settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
    });

    document.addEventListener(
      "paste",
      (event) => {
        void handlePaste(event, settings, remoteRules);
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
          const detection = createDetection(inputText, settings, remoteRules);
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

function createDetection(inputText: string, settings: AiMaeCheckSettings, remoteRules: DetectorRule[]): DetectionResult {
  return detectSensitiveText(inputText, {
    disabledRuleIds: disabledRuleIds(settings),
    extraRules: remoteRules
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
    try {
      const result = await analyzeSanitizeWithBridge(inputText, {
        modelId: settings.llm.modelId,
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
          message:
            "安全な依頼文の再スキャンで高リスク情報が残っている可能性があります。MaskまたはGeneralizeを選んでください。"
        };
      }

      return {
        text: result.safePrompt,
        message: result.userVisibleExplanation
      };
    } catch (error) {
      const detail = classifyLlmError(error);
      return {
        blocked: true,
        error: detail.message
      };
    }
  };
}

async function handlePaste(event: ClipboardEvent, settings: AiMaeCheckSettings, remoteRules: DetectorRule[]): Promise<void> {
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
    disabledRuleIds: disabledRuleIds(settings),
    extraRules: remoteRules
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
