import { CopyCheck } from "lucide-react";
import { Button } from "./ui";

export function MaskResult({
  maskedText,
  copyMessage,
  onCopy
}: {
  maskedText: string;
  copyMessage: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-muted">マスキング後の出力</p>
          <h3 className="text-xl font-black text-ink">マスク結果</h3>
        </div>
        <Button onClick={onCopy} variant="ghost" disabled={!maskedText}>
          <CopyCheck size={17} aria-hidden="true" />
          コピー
        </Button>
      </div>
      <pre className="flex-1 whitespace-pre-wrap break-words rounded-card border border-line bg-[#101314] p-4 text-sm leading-6 text-[#e9eee9] shadow-inner">
        {maskedText || "検出を実行すると、ここにマスキング後のテキストが表示されます。"}
      </pre>
      {copyMessage && <p className="mt-3 text-sm font-bold text-leaf">{copyMessage}</p>}
    </div>
  );
}
