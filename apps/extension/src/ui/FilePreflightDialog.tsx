import { useEffect, useRef, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components/Modal";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { formatFileSize } from "../lib/fileSize";
import { decisionRiskLabels } from "../lib/riskLabels";
import type { FilePreflightModalDecision, FilePreflightModalOptions } from "./fileModalTypes";
import { useShadowDialogTabContainment } from "./shadowDialogTabContainment";

interface FilePreflightDialogProps {
  options: FilePreflightModalOptions;
  portalContainer: HTMLElement;
  onDecision: (decision: FilePreflightModalDecision) => void;
}

export function FilePreflightDialog({ options, portalContainer, onDecision }: FilePreflightDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const pendingDecision = useRef<FilePreflightModalDecision | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useShadowDialogTabContainment(dialogRef);

  const close = (decision: FilePreflightModalDecision) => {
    if (pendingDecision.current) {
      return;
    }

    // ChromeではShadow内のfocus要素を除去するとhostがactiveElementに残るため、
    // React AriaのFocusScopeが標準の復帰処理を行えるよう先にblurする。
    const shadowRoot = portalContainer.getRootNode();
    if (shadowRoot instanceof ShadowRoot && shadowRoot.activeElement instanceof HTMLElement) {
      shadowRoot.activeElement.blur();
    }

    pendingDecision.current = decision;
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen || !pendingDecision.current) {
      return;
    }

    // FocusScopeによる元要素への復帰後に、外側の命令的Promise APIを完了する。
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        onDecision(pendingDecision.current ?? "cancel");
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [isOpen, onDecision]);

  return (
    <UNSAFE_PortalProvider getContainer={() => portalContainer}>
      <ModalOverlay
        isOpen={isOpen}
        isDismissable
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            close("cancel");
          }
        }}
        className="amc-overlay"
      >
        <Modal className="amc-dialog">
          <Dialog
            aria-label="ファイル添付前確認"
            className="amc-dialog-content"
            ref={dialogRef}
          >
            <header className="amc-header">
              <h2 className="amc-title">ファイル添付前に確認しますか？</h2>
              <p className="amc-description">
                テキスト系ファイルに注意が必要な情報が含まれている可能性があります。ファイル本文は保存しません。
              </p>
            </header>

            <div className="amc-body">
              <p className="amc-note">
                PDF / docx / xlsx / 画像や画像OCRが必要なファイルは対象外です。本文解析は行わず、安全判定済みとは扱いません。
              </p>

              {options.items.map((item) => (
                <section className="amc-file" key={`${item.fileName}:${item.size}`}>
                  <div className="amc-heading">
                    <span className="amc-name">{item.fileName}</span>
                    <span className={`amc-badge amc-${item.policy.risk.level}`}>
                      判定: {decisionRiskLabels[item.policy.risk.level]}
                    </span>
                    <span className="amc-badge">{item.detection.findings.length}件</span>
                    <span className="amc-badge">{formatFileSize(item.size)}</span>
                  </div>
                  <p className="amc-note">安全版候補: {item.safeFileName}</p>
                  {item.policy.requiresSanitization ? (
                    <p className="amc-note">高リスクまたは秘密情報保護の対象が含まれるため、そのまま添付はできません。</p>
                  ) : null}
                </section>
              ))}

              {options.unsupportedFileNames.length > 0 ? (
                <p className="amc-note">対象外ファイル: {options.unsupportedFileNames.join(", ")}</p>
              ) : null}
            </div>

            <footer className="amc-footer">
              <button autoFocus className="amc-button amc-primary" type="button" onClick={() => close("safe")}>
                安全版を作成して添付
              </button>
              {options.canAttachRaw ? (
                <button className="amc-button" type="button" onClick={() => close("allow_raw")}>
                  このまま添付
                </button>
              ) : null}
              <button className="amc-button" type="button" onClick={() => close("cancel")}>
                添付をキャンセル
              </button>
            </footer>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </UNSAFE_PortalProvider>
  );
}
