import { Clipboard, RefreshCcw, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import type { DetectionResult, DetectionSummary, Finding } from "@harumae/core";
import type { ContextRiskCandidate, LlmErrorDetail } from "@harumae/llm";
import type { LlmStatus } from "../lib/demoConstants";
import { Button, Surface } from "./ui";
import { DetectionResults } from "./DetectionResults";
import { MaskResult } from "./MaskResult";

export function DemoCard({
  text,
  onTextChange,
  onInsertSample,
  onRuleDetection,
  onLlmDetection,
  onCopyMaskedText,
  onReset,
  detection,
  summary,
  selectedRuleFindingIds,
  onToggleRuleFinding,
  llmCandidates,
  selectedCandidateIds,
  onToggleCandidate,
  llmStatus,
  llmMessage,
  llmErrorDetail,
  maskedText,
  copyMessage
}: {
  text: string;
  onTextChange: (value: string) => void;
  onInsertSample: () => void;
  onRuleDetection: () => void;
  onLlmDetection: () => void;
  onCopyMaskedText: () => void;
  onReset: () => void;
  detection: DetectionResult | null;
  summary: DetectionSummary;
  selectedRuleFindingIds: string[];
  onToggleRuleFinding: (id: string) => void;
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  onToggleCandidate: (id: string) => void;
  llmStatus: LlmStatus;
  llmMessage: string;
  llmErrorDetail: LlmErrorDetail | null;
  maskedText: string;
  copyMessage: string;
}) {
  const findings: Finding[] = detection?.findings ?? [];

  return (
    <section id="demo" className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-bold text-leaf">ライブデモ</p>
            <h2 className="max-w-4xl text-3xl font-black leading-tight text-ink md:text-4xl">貼る前に、消す場所を選ぶ。</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
              サンプル文を入れて、検出項目ごとにマスク対象を切り替えてください。本文は保存されません。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:max-w-[680px] lg:justify-end">
            <Button onClick={onInsertSample} variant="ghost">
              <Clipboard size={17} aria-hidden="true" />
              サンプル文を挿入
            </Button>
            <Button onClick={onRuleDetection} variant="primary">
              <ShieldCheck size={17} aria-hidden="true" />
              ルールベースで検出
            </Button>
            <Button onClick={onLlmDetection} variant="secondary" disabled={llmStatus === "loading" || llmStatus === "analyzing"}>
              <Sparkles size={17} aria-hidden="true" />
              AI文脈チェックも実行
            </Button>
            <Button onClick={onCopyMaskedText} variant="ghost" disabled={!maskedText}>
              <Wand2 size={17} aria-hidden="true" />
              マスキング後テキストをコピー
            </Button>
            <Button onClick={onReset} variant="ghost">
              <RefreshCcw size={17} aria-hidden="true" />
              リセット
            </Button>
          </div>
        </div>

        <Surface className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.04fr_0.96fr]">
            <div className="border-b border-line p-4 md:p-6 lg:border-b-0 lg:border-r">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Paste Draft</p>
                  <h3 className="text-xl font-black text-ink">貼り付け前テキスト</h3>
                </div>
                <span className="rounded-card bg-cloud px-3 py-2 text-xs font-bold text-muted">{text.length.toLocaleString()}文字</span>
              </div>
              <div className="rounded-card border border-line bg-white/80 p-3 shadow-inner">
                <textarea
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  className="min-h-[430px] w-full resize-y bg-transparent p-2 text-sm leading-7 text-ink outline-none placeholder:text-slate-400"
                  placeholder="ここにAIへ貼る前の文章を入力してください。"
                />
              </div>
            </div>

            <div className="p-4 md:p-6">
              <DetectionResults
                findings={findings}
                selectedFindingIds={selectedRuleFindingIds}
                onToggleFinding={onToggleRuleFinding}
                summary={summary}
                llmStatus={llmStatus}
                llmMessage={llmMessage}
                llmErrorDetail={llmErrorDetail}
                llmCandidates={llmCandidates}
                selectedCandidateIds={selectedCandidateIds}
                onToggleCandidate={onToggleCandidate}
              />
            </div>
          </div>

          <div className="border-t border-line bg-white/60 p-4 md:p-6">
            <MaskResult maskedText={maskedText} copyMessage={copyMessage} onCopy={onCopyMaskedText} />
          </div>
        </Surface>
      </div>
    </section>
  );
}
