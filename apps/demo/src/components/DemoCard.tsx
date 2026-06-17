import { Clipboard, RefreshCcw, ShieldCheck, Sparkles, Wand2, type LucideIcon } from "lucide-react";
import type { DetectionResult, DetectionSummary, Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate, LlmErrorDetail } from "@ai-mae-check/llm";
import type { LlmStatus } from "../lib/demoConstants";
import {
  createDemoWorkbenchActions,
  type DemoWorkbenchActionIcon,
  type DemoWorkbenchActionId
} from "../lib/demoWorkbenchActions";
import { Button, Surface } from "./ui";
import { DetectionResults } from "./DetectionResults";
import { MaskResult } from "./MaskResult";

const workflowSteps = [
  { label: "1", title: "サンプルを入れる", text: "拡張の動きをページ上で先に確認できます" },
  { label: "2", title: "候補を確認", text: "検出項目ごとにマスク対象を選べます" },
  { label: "3", title: "安全化結果を見る", text: "実際の拡張では貼り付け前に同じ判断をします" }
];

const actionIcons: Record<DemoWorkbenchActionIcon, LucideIcon> = {
  clipboard: Clipboard,
  sparkles: Sparkles,
  shield_check: ShieldCheck,
  wand: Wand2,
  refresh: RefreshCcw
};

export function DemoCard({
  text,
  onTextChange,
  onInsertSample,
  onInsertContextSample,
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
  onInsertContextSample: () => void;
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
  const actionHandlers: Record<DemoWorkbenchActionId, () => void> = {
    sample_rules: onInsertSample,
    sample_context: onInsertContextSample,
    detect_rules: onRuleDetection,
    check_context: onLlmDetection,
    copy_masked: onCopyMaskedText,
    reset: onReset
  };
  const actions = createDemoWorkbenchActions({
    llmStatus,
    hasMaskedText: maskedText.length > 0
  });

  return (
    <section id="demo" className="px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-black text-leaf">拡張を入れる前のミニデモ</p>
            <h2 className="text-3xl font-black leading-tight text-ink md:text-5xl">貼り付け前チェックの動きを試す</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted md:text-lg">
              本番の体験はChrome拡張として、対象サイトの入力欄に貼り付ける直前に表示されます。
              ここでは同じ検出エンジンを使って、候補選択とマスキングの流れだけをブラウザ上で確認できます。
            </p>
          </div>
          <div className="grid gap-2 rounded-card border border-line bg-white/75 p-3 shadow-soft">
            <p className="text-xs font-black text-leaf">デモで確認できること</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {workflowSteps.map((step) => (
                <div key={step.title} className="rounded-[6px] bg-cloud p-3">
                  <p className="text-xs font-black text-leaf">{step.label}</p>
                  <p className="mt-1 text-sm font-black text-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Surface className="overflow-hidden border-ink/10">
          <div className="border-b border-line bg-ink px-4 py-4 text-white md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black text-white/60">AIまえチェック ミニデモ</p>
                <h3 className="mt-1 text-xl font-black tracking-normal">拡張機能の基本フローを、このページ上で体験</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap xl:justify-end">
                {actions.map((action) => {
                  const Icon = actionIcons[action.icon];
                  return (
                    <Button
                      key={action.id}
                      onClick={actionHandlers[action.id]}
                      variant={action.variant}
                      disabled={action.disabled}
                      className={action.className}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)_minmax(0,1fr)]">
            <div className="border-b border-line bg-white p-4 md:p-6 xl:border-b-0 xl:border-r">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-muted">外部AIへ送る前の下書き</p>
                  <h3 className="text-xl font-black text-ink">入力テキスト</h3>
                </div>
                <span className="rounded-card bg-cloud px-3 py-2 text-xs font-black text-muted">{text.length.toLocaleString()}文字</span>
              </div>
              <div className="rounded-card border border-line bg-[#fbfdf9] p-3 shadow-inner">
                <textarea
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  className="min-h-[320px] w-full resize-y bg-transparent p-2 text-sm leading-7 text-ink outline-none placeholder:text-slate-400 md:min-h-[480px]"
                  placeholder="ここにAIへ貼る前の文章を入力してください。"
                />
              </div>
            </div>

            <div className="border-b border-line bg-[#f8faf7] p-4 md:p-6 xl:border-b-0 xl:border-r">
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

            <div className="bg-white p-4 md:p-6">
              <MaskResult maskedText={maskedText} copyMessage={copyMessage} onCopy={onCopyMaskedText} />
            </div>
          </div>
        </Surface>
      </div>
    </section>
  );
}
