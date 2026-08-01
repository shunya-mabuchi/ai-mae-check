import type { DetectionSummary, Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import type { LlmStatus } from "./demoConstants";
import { createDemoFindingItemViewModel, type DemoFindingItemViewModel } from "./demoFindingItem";
import {
  createDemoLlmCandidateItemViewModel,
  type DemoLlmCandidateItemViewModel
} from "./demoLlmCandidateItem";
import { createLlmStatusPanelViewModel, type LlmStatusPanelViewModel } from "./demoLlmUiState";
import {
  createRiskCountTiles,
  createRiskSummaryViewModel,
  type RiskCountTile,
  type RiskSummaryViewModel
} from "./demoRiskSummary";

export const DETECTION_RESULTS_NO_CATEGORY_MESSAGE = "まだ検出結果はありません。";
export const DETECTION_RESULTS_EMPTY_MESSAGE =
  "サンプルを挿入して、ルールベース検出またはAI文脈チェックを実行してください。";
export const LLM_CANDIDATE_NOTE = "AI文脈チェックは候補表示です。安全を保証するものではありません。";

export interface DemoDetectionResultsViewOptions {
  findings: Finding[];
  selectedFindingIds: string[];
  summary: DetectionSummary;
  llmStatus: LlmStatus;
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
}

export interface DemoDetectionResultsViewModel {
  totalText: string;
  riskSummary: RiskSummaryViewModel;
  riskCountTiles: RiskCountTile[];
  categoryEmptyMessage: string | null;
  findingsEmptyMessage: string | null;
  findingItems: DemoFindingItemViewModel[];
  llmStatusPanel: LlmStatusPanelViewModel;
  candidateItems: DemoLlmCandidateItemViewModel[];
  hasCandidates: boolean;
  llmCandidateNote: string;
}

export function createDemoDetectionResultsViewModel(
  options: DemoDetectionResultsViewOptions
): DemoDetectionResultsViewModel {
  const selectedFindingIdSet = new Set(options.selectedFindingIds);
  const selectedCandidateIdSet = new Set(options.selectedCandidateIds);
  const riskSummary = createRiskSummaryViewModel(options.summary, options.findings);
  const findingItems = options.findings.map((finding) =>
    createDemoFindingItemViewModel(finding, selectedFindingIdSet.has(finding.id))
  );
  const candidateItems = options.llmCandidates.map((candidate) =>
    createDemoLlmCandidateItemViewModel(candidate, selectedCandidateIdSet.has(candidate.id))
  );

  return {
    totalText: `${options.summary.total}件`,
    riskSummary,
    riskCountTiles: createRiskCountTiles(options.summary),
    categoryEmptyMessage: riskSummary.categories.length === 0 ? DETECTION_RESULTS_NO_CATEGORY_MESSAGE : null,
    findingsEmptyMessage: findingItems.length === 0 ? DETECTION_RESULTS_EMPTY_MESSAGE : null,
    findingItems,
    llmStatusPanel: createLlmStatusPanelViewModel(options.llmStatus),
    candidateItems,
    hasCandidates: candidateItems.length > 0,
    llmCandidateNote: LLM_CANDIDATE_NOTE
  };
}
