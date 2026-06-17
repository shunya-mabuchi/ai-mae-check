import { AlertTriangle, CheckCircle2, ListChecks, Sparkles } from "lucide-react";
import type { DetectionSummary, Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate, LlmErrorDetail } from "@ai-mae-check/llm";
import { riskLabel, riskMeterTone, riskTone, type LlmStatus } from "../lib/demoConstants";
import { createDemoFindingItemViewModel } from "../lib/demoFindingItem";
import { createLlmStatusPanelViewModel } from "../lib/demoLlmUiState";
import { createRiskCountTiles, createRiskSummaryViewModel } from "../lib/demoRiskSummary";

function LlmCandidates({
  candidates,
  selectedCandidateIds,
  onToggle
}: {
  candidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  onToggle: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-black text-ink">AI文脈チェック結果</h4>
      {candidates.map((candidate) => (
        <label key={candidate.id} className="block rounded-card border border-line bg-white p-3 shadow-soft">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-leaf"
              checked={selectedCandidateIds.includes(candidate.id)}
              onChange={() => onToggle(candidate.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-black text-ink">{candidate.label}</span>
                <span className={`rounded-card border px-2 py-1 text-xs font-bold ${riskTone[candidate.riskLevel]}`}>
                  危険度: {riskLabel[candidate.riskLevel]}
                </span>
                <span className="text-xs text-muted">信頼度: {candidate.confidence.toFixed(2)}</span>
              </div>
              <p className="break-all rounded-[6px] bg-cloud px-2 py-1 font-mono text-sm">{candidate.surface}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{candidate.reason}</p>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

export function DetectionResults({
  findings,
  selectedFindingIds,
  onToggleFinding,
  summary,
  llmStatus,
  llmMessage,
  llmErrorDetail,
  llmCandidates,
  selectedCandidateIds,
  onToggleCandidate
}: {
  findings: Finding[];
  selectedFindingIds: string[];
  onToggleFinding: (id: string) => void;
  summary: DetectionSummary;
  llmStatus: LlmStatus;
  llmMessage: string;
  llmErrorDetail: LlmErrorDetail | null;
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  onToggleCandidate: (id: string) => void;
}) {
  const riskSummary = createRiskSummaryViewModel(summary, findings);
  const riskCountTiles = createRiskCountTiles(summary);
  const llmStatusPanel = createLlmStatusPanelViewModel(llmStatus);

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-muted">リスクサマリー</p>
            <h3 className="mt-1 text-xl font-black text-ink">検出結果</h3>
          </div>
          <div className="rounded-card bg-ink px-3 py-2 text-sm font-black text-white">{summary.total}件</div>
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-black text-ink">{riskSummary.status.label}</p>
          <p className="text-xs font-bold text-muted">{riskSummary.meterWidth}%</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-cloud">
          <div
            className={`h-full rounded-full ${riskMeterTone[riskSummary.meterRisk]}`}
            style={{ width: `${riskSummary.meterWidth}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{riskSummary.status.text}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {riskCountTiles.map((tile) => (
            <div key={tile.key} className={tile.containerClassName}>
              <p className={tile.labelClassName}>{tile.label}</p>
              <p className={tile.countClassName}>{tile.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks size={17} className="text-leaf" aria-hidden="true" />
          <p className="text-sm font-black text-ink">検出カテゴリ</p>
        </div>
        {riskSummary.categories.length === 0 ? (
          <p className="rounded-card bg-cloud p-3 text-sm text-muted">まだ検出結果はありません。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {riskSummary.categories.map((category) => (
              <span key={category.label} className="rounded-card border border-line bg-white px-3 py-2 text-xs font-black text-ink">
                {category.label} {category.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
        {findings.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-white/80 p-4 text-sm leading-6 text-muted">
            サンプルを挿入して、ルールベース検出またはAI文脈チェックを実行してください。
          </p>
        ) : (
          findings.map((finding) => {
            const item = createDemoFindingItemViewModel(finding, selectedFindingIds.includes(finding.id));
            return (
              <label key={item.id} className="block rounded-card border border-line bg-white p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-leaf"
                    checked={item.selected}
                    onChange={() => onToggleFinding(item.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={item.riskBadgeClassName}>{item.riskBadgeText}</span>
                      <span className="text-sm font-black text-ink">{item.label}</span>
                      <span className="text-xs text-muted">{item.sourceLabel}</span>
                      <span className={item.selectionClassName}>{item.selectionLabel}</span>
                    </div>
                    <p className="break-all rounded-[6px] bg-cloud px-2 py-1 font-mono text-sm text-ink">{item.text}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.message}</p>
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>

      <div className={llmStatusPanel.className}>
        <div className="flex items-start gap-2">
          {llmStatusPanel.icon === "check" ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          )}
          <p>{llmMessage}</p>
        </div>
        {llmStatus === "error" && llmErrorDetail && (
          <div className="mt-3 rounded-[6px] border border-current/15 bg-white/60 p-3 text-xs leading-5">
            <p className="font-bold">診断メモ: {llmErrorDetail.hint}</p>
            {llmErrorDetail.technicalDetail && (
              <p className="mt-2 break-words font-mono text-[11px] opacity-80">detail: {llmErrorDetail.technicalDetail}</p>
            )}
          </div>
        )}
      </div>

      <LlmCandidates candidates={llmCandidates} selectedCandidateIds={selectedCandidateIds} onToggle={onToggleCandidate} />
      <div className="flex items-center gap-2 rounded-card bg-leaf/10 px-3 py-2 text-xs font-black text-leaf">
        <Sparkles size={15} aria-hidden="true" />
        AI文脈チェックは候補表示です。安全を保証するものではありません。
      </div>
    </div>
  );
}
