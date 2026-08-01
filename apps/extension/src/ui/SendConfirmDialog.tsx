import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components/Modal";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { getBrandIconUrl } from "../lib/brandIcon";
import type {
  ConfirmModalDecision,
  ConfirmModalSummaryItem,
  SendConfirmDialogElements
} from "./confirmModalTypes";
import { useShadowDialogTabContainment } from "./shadowDialogTabContainment";

interface SendConfirmDialogProps {
  title: string;
  description: string;
  summaryItems: ConfirmModalSummaryItem[];
  initialLlmMessage: string;
  initialStatusMessage: string;
  portalContainer: HTMLElement;
  onReady: (
    elements: SendConfirmDialogElements,
    close: (decision: ConfirmModalDecision) => void
  ) => void;
  onClosing: () => void;
  onClosed: (decision: ConfirmModalDecision) => void;
}

export function SendConfirmDialog({
  title,
  description,
  summaryItems,
  initialLlmMessage,
  initialStatusMessage,
  portalContainer,
  onReady,
  onClosing,
  onClosed
}: SendConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const pendingDecision = useRef<ConfirmModalDecision | null>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLPreElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const llmStatusRef = useRef<HTMLParagraphElement>(null);
  const candidateListRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const llmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useShadowDialogTabContainment(dialogRef);
  const decision = summaryItems[0]?.value ?? "確認";

  const close = useCallback(
    (nextDecision: ConfirmModalDecision) => {
      if (pendingDecision.current) {
        return;
      }

      const shadowRoot = portalContainer.getRootNode();
      if (shadowRoot instanceof ShadowRoot && shadowRoot.activeElement instanceof HTMLElement) {
        shadowRoot.activeElement.blur();
      }

      pendingDecision.current = nextDecision;
      onClosing();
      setIsOpen(false);
    },
    [onClosing, portalContainer]
  );

  useEffect(() => {
    const elements = {
      categoryList: categoryListRef.current,
      preview: previewRef.current,
      status: statusRef.current,
      llmStatus: llmStatusRef.current,
      candidateList: candidateListRef.current,
      submitButton: submitButtonRef.current,
      llmButton: llmButtonRef.current,
      cancelButton: cancelButtonRef.current
    };

    if (Object.values(elements).every((element) => element !== null)) {
      onReady(elements as SendConfirmDialogElements, close);
    }
  }, [close, onReady]);

  useEffect(() => {
    if (isOpen || !pendingDecision.current) {
      return;
    }

    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        onClosed(pendingDecision.current ?? { type: "cancel" });
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [isOpen, onClosed]);

  return (
    <UNSAFE_PortalProvider getContainer={() => portalContainer}>
      <ModalOverlay
        isOpen={isOpen}
        isDismissable
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            close({ type: "cancel" });
          }
        }}
        className="amc-overlay"
      >
        <Modal className="amc-dialog">
          <Dialog
            aria-label={title}
            className="amc-dialog-content"
            ref={dialogRef}
          >
            <header className="amc-header">
              <div className="amc-header-top">
                <div className="amc-brand">
                  <span className="amc-brand-mark" aria-hidden="true">
                    <img className="amc-brand-mark-image" alt="" decoding="async" src={getBrandIconUrl()} />
                  </span>
                  <h2 className="amc-brand-name">AIまえチェック</h2>
                </div>
                <span className="amc-mode-badge">送信前チェック</span>
                <div className="amc-risk-pill">判定 {decision}</div>
              </div>
              <h3 className="amc-title">{title}</h3>
              <p className="amc-description">{description}</p>
            </header>

            <div className="amc-body">
              <section className="amc-summary" aria-labelledby="amc-risk-summary-heading">
                <h3 className="amc-visually-hidden" id="amc-risk-summary-heading">送信前リスク概要</h3>
                {summaryItems.map((item) => (
                  <div className="amc-metric" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </section>

              <div className="amc-grid">
                <section className="amc-panel" aria-labelledby="amc-categories-heading">
                  <h3 id="amc-categories-heading">確認するカテゴリ</h3>
                  <p className="amc-panel-caption">置換必須のカテゴリは安全化対象から外せません。</p>
                  <div
                    className="amc-categories"
                    role="group"
                    aria-labelledby="amc-categories-heading"
                    ref={categoryListRef}
                  />
                </section>

                <section className="amc-panel" aria-labelledby="amc-preview-heading">
                  <h3 id="amc-preview-heading">安全化後の内容</h3>
                  <p className="amc-panel-caption">この内容が送信前に入力欄へ反映されます。</p>
                  <p className="amc-note" role="status" aria-live="polite" ref={statusRef}>
                    {initialStatusMessage}
                  </p>
                  <pre className="amc-preview" aria-label="安全化後の内容" ref={previewRef} />
                  <div className="amc-trust-strip">
                    <span>ブラウザ内で実行</span>
                    <span>外部LLM APIへ送信なし</span>
                    <span>本文保存なし</span>
                  </div>

                  <section className="amc-llm-panel" aria-labelledby="amc-llm-heading">
                    <h3 id="amc-llm-heading">AI文脈チェック</h3>
                    <p className="amc-note" role="status" aria-live="polite" ref={llmStatusRef}>
                      {initialLlmMessage}
                    </p>
                    <div
                      className="amc-candidates"
                      role="group"
                      aria-labelledby="amc-llm-heading"
                      ref={candidateListRef}
                    />
                  </section>
                </section>
              </div>
            </div>

            <footer className="amc-footer">
              <div className="amc-footer-actions">
                <button className="amc-button amc-ghost" type="button" ref={cancelButtonRef}>
                  キャンセル
                </button>
                <button
                  className="amc-button amc-secondary"
                  type="button"
                  title="AI文脈チェックを実行"
                  ref={llmButtonRef}
                >
                  AIチェック
                </button>
                <button autoFocus className="amc-button amc-primary" type="button" ref={submitButtonRef} />
              </div>
            </footer>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </UNSAFE_PortalProvider>
  );
}
