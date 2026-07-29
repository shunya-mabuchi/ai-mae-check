import { defineContentScript } from "wxt/utils/define-content-script";
import type { DetectorRule } from "@ai-mae-check/core";
import { adapterForHostname } from "../src/content/adapters";
import {
  createContentGuardContext,
  createSendReviewRequest,
  type ContentReviewRequest,
  isContentSiteEnabled,
  type PasteReviewRequest
} from "../src/content/contentReview";
import { installFileInterceptor } from "../src/content/dom/fileInterceptor";
import { installPasteInterceptor, type PasteReviewDecision } from "../src/content/dom/pasteInterceptor";
import { installSendInterceptor, type SendReviewDecision } from "../src/content/dom/sendInterceptor";
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, SETTINGS_KEY, type AiMaeCheckSettings } from "../src/lib/settings";
import { loadVerifiedRemoteRules } from "../src/lib/remoteRuleDelivery";
import { targetMatches } from "../src/lib/sites";
import { showPasteReviewModal } from "../src/lib/modal";
import { showSendConfirmModal } from "../src/ui/confirmModal";

export default defineContentScript({
  matches: targetMatches,
  runAt: "document_start",
  main() {
    const hostname = window.location.hostname;
    const adapter = adapterForHostname(hostname);
    let settings: AiMaeCheckSettings = DEFAULT_SETTINGS;
    let remoteRules: DetectorRule[] = [];

    const refreshRemoteRules = async () => {
      const result = await loadVerifiedRemoteRules();
      remoteRules = result.status === "verified" || result.status === "cached" ? result.rules : [];
    };

    void loadSettings().then((loadedSettings) => {
      settings = loadedSettings;
      void refreshRemoteRules();
    }).catch(() => {
      settings = DEFAULT_SETTINGS;
      void refreshRemoteRules();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SETTINGS_KEY]) {
        return;
      }

      settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
    });

    const isEnabled = () => isContentSiteEnabled(settings, hostname);
    const getGuardContext = () =>
      createContentGuardContext({
        settings,
        remoteRules
      });

    installPasteInterceptor({
      isEnabled,
      getGuardContext,
      review: (request) => launchPasteReview(request, settings)
    });

    installFileInterceptor({
      isEnabled,
      disabledRuleIds: () => getGuardContext().disabledRuleIds
    });

    if (adapter) {
      installSendInterceptor({
        adapter,
        isEnabled,
        prepareReview: (inputText) => createSendReviewRequest(inputText, getGuardContext()),
        review: (request) => launchSendReview(request, settings)
      });
    }
  }
});

async function launchPasteReview(
  request: PasteReviewRequest,
  settings: AiMaeCheckSettings
): Promise<PasteReviewDecision> {
  return showPasteReviewModal({
    inputText: request.inputText,
    detection: request.detection,
    settings,
    mode: request.mode
  });
}

async function launchSendReview(
  request: ContentReviewRequest,
  settings: AiMaeCheckSettings
): Promise<SendReviewDecision> {
  const decision = await showSendConfirmModal({
    inputText: request.inputText,
    detection: request.detection,
    llm: settings.llm
  });

  if (decision.type === "submit") {
    return {
      type: "replaceAndSubmit",
      text: decision.text
    };
  }

  return { type: "cancel" };
}
