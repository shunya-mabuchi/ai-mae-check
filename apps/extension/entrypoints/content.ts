import { defineContentScript } from "wxt/utils/define-content-script";
import { detectSensitiveText, evaluateDlpPolicy, type DetectionResult } from "@ai-mae-check/core";
import { adapterForHostname } from "../src/content/adapters";
import { evaluatePasteGuard } from "../src/content/dom/pasteGuard";
import { installSendInterceptor } from "../src/content/dom/sendInterceptor";
import { readEditableText } from "../src/content/dom/editorLocator";
import { captureCurrentRange, findEditableTarget, insertTextAtTarget, type EditableTarget } from "../src/lib/dom";
import { DEFAULT_SETTINGS, disabledRuleIds, isSiteEnabled, loadSettings, normalizeSettings, SETTINGS_KEY, type AiMaeCheckSettings } from "../src/lib/settings";
import { targetMatches } from "../src/lib/sites";
import { showPasteReviewModal } from "../src/lib/modal";
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
          const decision = await showPasteReviewModal({
            inputText,
            detection,
            settings
          });

          if (decision.type === "insert") {
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
