import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components/Modal";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { getBrandIconUrl } from "../lib/brandIcon";
import type { PasteReviewModalCopy } from "../lib/pasteReviewModalCopy";
import type {
  PasteReviewDialogElements,
  PasteReviewModalDecision
} from "../lib/pasteReviewModalTypes";
import type { PasteReviewSummaryItem } from "../lib/pasteReviewSummaryView";

const riskSummaryLabels = {
  critical: "重大リスク",
  high: "高リスク",
  medium: "中リスク",
  low: "低リスク"
} as const;

const riskSummaryOrder = ["critical", "high", "medium", "low"] as const;

interface PasteReviewDialogProps {
  modalCopy: PasteReviewModalCopy;
  summaryItems: PasteReviewSummaryItem[];
  initialLlmMessage: string;
  portalContainer: HTMLElement;
  onReady: (
    elements: PasteReviewDialogElements,
    close: (decision: PasteReviewModalDecision) => void
  ) => void;
  onClosing: () => void;
  onClosed: (decision: PasteReviewModalDecision) => void;
}

function selectHeaderRisk(items: PasteReviewSummaryItem[]): PasteReviewSummaryItem | undefined {
  return (
    riskSummaryOrder
      .map((level) => items.find((item) => item.level === level && item.count > 0))
      .find((item): item is PasteReviewSummaryItem => Boolean(item)) ??
    items.find((item) => item.level === "low") ??
    items[0]
  );
}

export function PasteReviewDialog({
  modalCopy,
  summaryItems,
  initialLlmMessage,
  portalContainer,
  onReady,
  onClosing,
  onClosed
}: PasteReviewDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const pendingDecision = useRef<PasteReviewModalDecision | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLPreElement>(null);
  const llmStatusRef = useRef<HTMLParagraphElement>(null);
  const candidateListRef = useRef<HTMLDivElement>(null);
  const footerNoteRef = useRef<HTMLParagraphElement>(null);
  const maskButtonRef = useRef<HTMLButtonElement>(null);
  const llmButtonRef = useRef<HTMLButtonElement>(null);
  const rawButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const selectedRisk = selectHeaderRisk(summaryItems);

  const close = useCallback(
    (decision: PasteReviewModalDecision) => {
      if (pendingDecision.current) {
        return;
      }

      const shadowRoot = portalContainer.getRootNode();
      if (shadowRoot instanceof ShadowRoot && shadowRoot.activeElement instanceof HTMLElement) {
        shadowRoot.activeElement.blur();
      }

      pendingDecision.current = decision;
      onClosing();
      setIsOpen(false);
    },
    [onClosing, portalContainer]
  );

  useEffect(() => {
    const elements = {
      list: listRef.current,
      preview: previewRef.current,
      llmStatus: llmStatusRef.current,
      candidateList: candidateListRef.current,
      footerNote: footerNoteRef.current,
      maskButton: maskButtonRef.current,
      llmButton: llmButtonRef.current,
      rawButton: rawButtonRef.current,
      cancelButton: cancelButtonRef.current
    };

    if (Object.values(elements).every((element) => element !== null)) {
      onReady(elements as PasteReviewDialogElements, close);
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
        className="hm-overlay"
      >
        <Modal className="hm-dialog">
          <Dialog aria-label={modalCopy.title} className="hm-dialog-content">
            <header className="hm-header">
              <div className="hm-header-top">
                <div className="hm-brand">
                  <span className="hm-brand-mark" aria-hidden="true">
                    <img className="hm-brand-mark-image" alt="" decoding="async" src={getBrandIconUrl()} />
                  </span>
                  <h2 className="hm-brand-name">AIまえチェック</h2>
                </div>
                <span className="hm-mode-badge">貼り付け前チェック</span>
                <div className={`hm-risk-pill hm-risk-pill-${selectedRisk?.level ?? "low"}`}>
                  {riskSummaryLabels[selectedRisk?.level ?? "low"]} {selectedRisk?.count ?? 0}件
                </div>
              </div>
              <h3 className="hm-title">{modalCopy.title}</h3>
              <p className="hm-description">{modalCopy.description}</p>
            </header>

            <div className="hm-body">
              <section className="hm-summary" aria-labelledby="hm-risk-summary-heading">
                <h3 className="hm-visually-hidden" id="hm-risk-summary-heading">リスク件数</h3>
                {summaryItems.map((item) => (
                  <div className={item.className} key={item.level}>
                    <span className="hm-count-label">{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </section>

              <div className="hm-grid">
                <section className="hm-panel" aria-labelledby="hm-findings-heading">
                  <h3 id="hm-findings-heading">検出された項目</h3>
                  <p className="hm-panel-caption">チェックを外した項目は安全化対象から外れます。</p>
                  <div className="hm-list" role="group" aria-labelledby="hm-findings-heading" ref={listRef} />
                </section>

                <section className="hm-panel" aria-labelledby="hm-preview-heading">
                  <h3 id="hm-preview-heading">安全化後プレビュー</h3>
                  <p className="hm-panel-caption">この内容が入力欄に反映されます。</p>
                  <pre className="hm-preview" aria-label="安全化後プレビュー" ref={previewRef} />
                  <div className="hm-preview-trust">
                    <span>ブラウザ内で実行</span>
                    <span>外部LLM APIへ送信なし</span>
                    <span>本文保存なし</span>
                  </div>
                </section>
              </div>

              <section className="hm-llm" aria-labelledby="hm-llm-heading">
                <h3 id="hm-llm-heading">AI文脈チェック</h3>
                <p className="hm-llm-status" role="status" aria-live="polite" ref={llmStatusRef}>
                  {initialLlmMessage}
                </p>
                <div role="group" aria-labelledby="hm-llm-heading" ref={candidateListRef} />
              </section>
            </div>

            <footer className="hm-footer">
              <p className="hm-footer-note" ref={footerNoteRef} />
              <div className="hm-footer-actions">
                <button className="hm-button hm-ghost" type="button" ref={cancelButtonRef}>
                  キャンセル
                </button>
                <button className="hm-button hm-secondary" type="button" ref={rawButtonRef}>
                  そのまま貼り付け
                </button>
                <button className="hm-button hm-secondary" type="button" ref={llmButtonRef}>
                  AI文脈チェックも実行
                </button>
                <button autoFocus className="hm-button hm-primary" type="button" ref={maskButtonRef}>
                  {modalCopy.maskButtonText}
                </button>
              </div>
            </footer>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </UNSAFE_PortalProvider>
  );
}
