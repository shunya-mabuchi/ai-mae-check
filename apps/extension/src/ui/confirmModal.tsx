import { evaluateDlpPolicy } from "@ai-mae-check/core";
import { createRoot } from "react-dom/client";
import { PASTE_REVIEW_LLM_INITIAL_MESSAGE } from "../lib/pasteReviewLlmState";
import { createReactShadowHost } from "../lib/shadowHost";
import { SendConfirmDialog } from "./SendConfirmDialog";
import { initializeSendConfirmModalController } from "./confirmModalController";
import { createCategoryGroups, decisionLabels } from "./confirmModalState";
import type {
  ConfirmModalDecision,
  SendConfirmModalOptions
} from "./confirmModalTypes";
import { confirmModalCss } from "./styles";

export type { ConfirmModalDecision, SendConfirmModalOptions } from "./confirmModalTypes";

export async function showSendConfirmModal(
  options: SendConfirmModalOptions
): Promise<ConfirmModalDecision> {
  return new Promise((resolve) => {
    const restoreFocusTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const policy = evaluateDlpPolicy(options.detection.findings);
    const groups = createCategoryGroups(options.detection.findings, policy);
    const mounted = createReactShadowHost(confirmModalCss);
    mounted.host.dataset.aiMaeCheckUi = "send-confirm";
    const root = createRoot(mounted.rootContainer);
    let closed = false;
    let finalized = false;
    let controller: { dispose: () => void } | undefined;

    const beginClosing = () => {
      if (closed) {
        return;
      }
      closed = true;
      controller?.dispose();
    };

    const finish = (decision: ConfirmModalDecision) => {
      if (finalized) {
        return;
      }
      finalized = true;
      beginClosing();
      queueMicrotask(() => {
        try {
          root.unmount();
        } finally {
          mounted.cleanup();
          // ChromeでShadow DOM境界を越えた復帰がbodyに落ちた場合だけ補完する。
          if (restoreFocusTarget?.isConnected && document.activeElement === document.body) {
            restoreFocusTarget.focus({ preventScroll: true });
          }
          resolve(decision);
        }
      });
    };

    root.render(
      <SendConfirmDialog
        title="送信前に安全化しますか？"
        description={
          policy.requiresSanitization
            ? "高リスクまたは秘密情報保護の対象が含まれるため、安全化なしでは送信できません。"
            : "注意が必要なカテゴリを確認できます。不要なカテゴリは詳細から外して、そのまま送信することもできます。"
        }
        summaryItems={[
          { label: "判定", value: decisionLabels[policy.risk.level] },
          { label: "スコア", value: `${policy.risk.score}` },
          { label: "カテゴリ", value: `${groups.length}` },
          { label: "検出", value: `${options.detection.findings.length}` }
        ]}
        initialLlmMessage={PASTE_REVIEW_LLM_INITIAL_MESSAGE}
        initialStatusMessage="具体的な値を、メールアドレス・電話番号などの日本語ラベルへ置き換えます。"
        portalContainer={mounted.portalContainer}
        onReady={(elements, close) => {
          if (closed) {
            return;
          }
          controller = initializeSendConfirmModalController({
            ...options,
            elements,
            close,
            isClosed: () => closed
          });
        }}
        onClosing={beginClosing}
        onClosed={finish}
      />
    );
  });
}
