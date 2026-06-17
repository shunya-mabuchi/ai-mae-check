import { CopyCheck, ShieldCheck } from "lucide-react";
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
    <div className="flex h-full min-h-[430px] flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">安全化後の出力</p>
          <h3 className="mt-1 text-xl font-black text-ink">安全化結果</h3>
          <p className="mt-2 text-sm leading-6 text-muted">チェックした項目だけを置き換えます。外部へ送る前の最終確認用です。</p>
        </div>
        <Button onClick={onCopy} variant="ghost" disabled={!maskedText}>
          <CopyCheck size={17} aria-hidden="true" />
          コピー
        </Button>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-card border border-leaf/20 bg-leaf/10 px-3 py-2 text-xs font-black text-leaf">
        <ShieldCheck size={15} aria-hidden="true" />
        元の本文と置換対応表は保存しません。
      </div>
      <pre className="flex-1 whitespace-pre-wrap break-words rounded-card border border-ink/10 bg-[#15191c] p-4 text-sm leading-6 text-[#e9eee9] shadow-inner">
        {maskedText || "検出を実行すると、ここに安全化後のテキストが表示されます。"}
      </pre>
      {copyMessage && <p className="mt-3 text-sm font-black text-leaf">{copyMessage}</p>}
    </div>
  );
}
