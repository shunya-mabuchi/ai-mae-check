import { defineContentScript } from "wxt/utils/define-content-script";
import type { DetectorRule } from "@ai-mae-check/core";
import { adapterForHostname } from "../src/content/adapters";
import {
  createContentGuardContext,
  createPasteReviewPlan,
  createSendReviewRequest,
  type ContentReviewRequest,
  isContentSiteEnabled,
  type PasteReviewRequest
} from "../src/content/contentReview";
import { installFileInterceptor } from "../src/content/dom/fileInterceptor";
import { installSendInterceptor, type SendReviewDecision } from "../src/content/dom/sendInterceptor";
import { captureCurrentRange, findEditableTarget, insertTextAtTarget } from "../src/lib/dom";
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

    const isEnabled = () => isContentSiteEnabled(settings, hostname);
    const getGuardContext = () =>
      createContentGuardContext({
        settings,
        remoteRules
      });

    document.addEventListener(
      "paste",
      (event) => {
        void handlePaste(event, {
          isEnabled,
          getGuardContext,
          launchReview: (request) => launchPasteReview(request, settings)
        });
      },
      true
    );

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

interface PasteHandlerOptions {
  isEnabled: () => boolean;
  getGuardContext: () => ReturnType<typeof createContentGuardContext>;
  launchReview: (request: PasteReviewRequest) => Promise<Awaited<ReturnType<typeof showPasteReviewModal>>>;
}

async function handlePaste(event: ClipboardEvent, options: PasteHandlerOptions): Promise<void> {
  if (!options.isEnabled()) {
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

  const plan = createPasteReviewPlan(pastedText, options.getGuardContext());
  if (plan.type === "allow") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const savedRange = captureCurrentRange(target);
  const decision = await options.launchReview(plan.request);

  if (decision.type === "insert") {
    insertTextAtTarget(target, decision.text, savedRange);
  }
}

async function launchPasteReview(
  request: PasteReviewRequest,
  settings: AiMaeCheckSettings
): Promise<Awaited<ReturnType<typeof showPasteReviewModal>>> {
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
