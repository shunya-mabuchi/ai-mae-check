import { AlertTriangle, CheckCircle2, ListChecks, Sparkles } from "lucide-react";
import type { DetectionSummary, Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate, LlmErrorDetail } from "@ai-mae-check/llm";
import { riskMeterTone, type LlmStatus } from "../lib/demoConstants";
import {
  createDemoDetectionResultsViewModel,
  type DemoDetectionResultsViewModel
} from "../lib/demoDetectionResultsView";

function LlmCandidates({
  items,
  onToggle
}: {
  items: DemoDetectionResultsViewModel["candidateItems"];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-black text-ink">AI文脈チェック結果</h4>
      {items.map((item) => (
        <label key={item.id} className="block rounded-card border border-line bg-white p-3 shadow-soft">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-leaf"
              checked={item.selected}
              onChange={() => onToggle(item.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-black text-ink">{item.label}</span>
                <span className={item.riskBadgeClassName}>{item.riskBadgeText}</span>
                <span className="text-xs text-muted">{item.confidenceText}</span>
              </div>
              <p className="break-all rounded-[6px] bg-cloud px-2 py-1 font-mono text-sm">{item.surface}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{item.reason}</p>
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
  const view = createDemoDetectionResultsViewModel({
    findings,
    selectedFindingIds,
    summary,
    llmStatus,
    llmCandidates,
    selectedCandidateIds
  });

  return (
    <div className="space-y-5" aria-label="検出結果" aria-live="polite">
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-muted">リスクサマリー</p>
            <h3 className="mt-1 text-xl font-black text-ink">検出結果</h3>
          </div>
          <div className="rounded-card bg-ink px-3 py-2 text-sm font-black text-white">{view.totalText}</div>
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-black text-ink">{view.riskSummary.status.label}</p>
          <p className="text-xs font-bold text-muted">{view.riskSummary.meterWidth}%</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-cloud">
          <div
            role="meter"
            aria-label="リスクメーター"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.riskSummary.meterWidth}
            aria-valuetext={view.riskSummary.status.label}
            className={`h-full rounded-full ${riskMeterTone[view.riskSummary.meterRisk]}`}
            style={{ width: `${view.riskSummary.meterWidth}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{view.riskSummary.status.text}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {view.riskCountTiles.map((tile) => (
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
        {view.categoryEmptyMessage ? (
          <p className="rounded-card bg-cloud p-3 text-sm text-muted">{view.categoryEmptyMessage}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {view.riskSummary.categories.map((category) => (
              <span key={category.label} className="rounded-card border border-line bg-white px-3 py-2 text-xs font-black text-ink">
                {category.label} {category.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
        {view.findingsEmptyMessage ? (
          <p className="rounded-card border border-dashed border-line bg-white/80 p-4 text-sm leading-6 text-muted">
            {view.findingsEmptyMessage}
          </p>
        ) : (
          view.findingItems.map((item) => (
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
          ))
        )}
      </div>

      <div className={view.llmStatusPanel.className} role="status" aria-live="polite">
        <div className="flex items-start gap-2">
          {view.llmStatusPanel.icon === "check" ? (
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

      <LlmCandidates items={view.candidateItems} onToggle={onToggleCandidate} />
      <div className="flex items-center gap-2 rounded-card bg-leaf/10 px-3 py-2 text-xs font-black text-leaf">
        <Sparkles size={15} aria-hidden="true" />
        {view.llmCandidateNote}
      </div>
    </div>
  );
}
