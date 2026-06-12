import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { DetectionSummary, Finding, RiskLevel } from "@harumae/core";
import type { ContextRiskCandidate, LlmErrorDetail } from "@harumae/llm";
import { riskLabel, riskMeterTone, riskTone, type LlmStatus } from "../lib/demoConstants";

function riskPercent(summary: DetectionSummary): number {
  const score = summary.high * 34 + summary.medium * 18 + summary.low * 8;
  return Math.min(100, score);
}

function strongestRisk(summary: DetectionSummary): RiskLevel {
  if (summary.high > 0) {
    return "high";
  }
  if (summary.medium > 0) {
    return "medium";
  }
  return "low";
}

function categoryCounts(findings: Finding[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.label, (counts.get(finding.label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

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
        <label key={candidate.id} className="block rounded-card border border-line bg-white/80 p-3">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-leaf"
              checked={selectedCandidateIds.includes(candidate.id)}
              onChange={() => onToggle(candidate.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">{candidate.label}</span>
                <span className={`rounded-card border px-2 py-1 text-xs font-bold ${riskTone[candidate.riskLevel]}`}>
                  危険度: {riskLabel[candidate.riskLevel]}
                </span>
                <span className="text-xs text-muted">confidence: {candidate.confidence.toFixed(2)}</span>
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
  const meterRisk = strongestRisk(summary);
  const meterWidth = riskPercent(summary);
  const categories = categoryCounts(findings);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Risk Meter</p>
            <h3 className="text-xl font-black text-ink">検出結果</h3>
          </div>
          <div className="rounded-card bg-ink px-3 py-2 text-sm font-black text-white">{summary.total}件</div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-cloud">
          <div className={`h-full rounded-full ${riskMeterTone[meterRisk]}`} style={{ width: `${meterWidth}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-card bg-rose-50 p-3">
            <p className="text-xs font-bold text-rose-700">高</p>
            <p className="text-2xl font-black text-rose-800">{summary.high}</p>
          </div>
          <div className="rounded-card bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-800">中</p>
            <p className="text-2xl font-black text-amber-900">{summary.medium}</p>
          </div>
          <div className="rounded-card bg-slate-100 p-3">
            <p className="text-xs font-bold text-slate-700">低</p>
            <p className="text-2xl font-black text-slate-800">{summary.low}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-black text-ink">検出カテゴリ</p>
        {categories.length === 0 ? (
          <p className="rounded-card bg-cloud p-3 text-sm text-muted">まだ検出結果はありません。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.label} className="rounded-card border border-line bg-white/80 px-3 py-2 text-xs font-bold text-ink">
                {category.label} {category.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
        {findings.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-white/60 p-4 text-sm text-muted">
            サンプル文を挿入して、ルールベース検出を実行してください。
          </p>
        ) : (
          findings.map((finding) => {
            const checked = selectedFindingIds.includes(finding.id);
            return (
              <label key={finding.id} className="block rounded-card border border-line bg-white/80 p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-leaf"
                    checked={checked}
                    onChange={() => onToggleFinding(finding.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-card border px-2 py-1 text-xs font-bold ${riskTone[finding.riskLevel]}`}>
                        危険度: {riskLabel[finding.riskLevel]}
                      </span>
                      <span className="text-sm font-black text-ink">{finding.label}</span>
                      <span className="text-xs text-muted">{finding.source === "llm" ? "AI候補" : "ルール"}</span>
                      <span className="text-xs font-bold text-leaf">{checked ? "マスク対象" : "対象外"}</span>
                    </div>
                    <p className="break-all rounded-[6px] bg-cloud px-2 py-1 font-mono text-sm text-ink">{finding.text}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{finding.message}</p>
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>

      <div
        className={`rounded-card border p-3 text-sm ${
          llmStatus === "error"
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : llmStatus === "done"
              ? "border-leaf/30 bg-emerald-50 text-emerald-900"
              : "border-line bg-white/70 text-muted"
        }`}
      >
        <div className="flex items-start gap-2">
          {llmStatus === "done" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
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
      <div className="flex items-center gap-2 rounded-card bg-leaf/10 px-3 py-2 text-xs font-bold text-leaf">
        <Sparkles size={15} aria-hidden="true" />
        AI文脈チェックは候補表示です。安全を保証するものではありません。
      </div>
    </div>
  );
}
