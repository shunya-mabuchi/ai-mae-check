import { defineContentScript } from "wxt/utils/define-content-script";
import { detectSensitiveText } from "@harumae/core";
import { captureCurrentRange, findEditableTarget, insertTextAtTarget } from "../src/lib/dom";
import { DEFAULT_SETTINGS, disabledRuleIds, isSiteEnabled, loadSettings, normalizeSettings, SETTINGS_KEY, type HarumaeSettings } from "../src/lib/settings";
import { targetMatches } from "../src/lib/sites";
import { showPasteReviewModal } from "../src/lib/modal";

export default defineContentScript({
  matches: targetMatches,
  runAt: "document_start",
  main() {
    let settings: HarumaeSettings = DEFAULT_SETTINGS;

    void loadSettings().then((loadedSettings) => {
      settings = loadedSettings;
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
        void handlePaste(event, settings);
      },
      true
    );
  }
});

async function handlePaste(event: ClipboardEvent, settings: HarumaeSettings): Promise<void> {
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

  const detection = detectSensitiveText(pastedText, {
    disabledRuleIds: disabledRuleIds(settings)
  });

  if (detection.findings.length === 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const savedRange = captureCurrentRange(target);
  const decision = await showPasteReviewModal({
    inputText: pastedText,
    detection,
    settings
  });

  if (decision.type === "insert") {
    insertTextAtTarget(target, decision.text, savedRange);
  }
}
