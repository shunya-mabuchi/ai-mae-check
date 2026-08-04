import type { RiskLevel } from "@ai-mae-check/core";
import { DEFAULT_MAX_CANDIDATES } from "./constants";
import { mergeResidualContextCandidates } from "./residualMasking";
import type { ContextRiskCandidate, ContextRiskCategory, LlmProgress } from "./types";

export const WASM_CONTEXT_LOADING_MESSAGE =
  "CPU用の文脈モデルを準備しています。初回のみ時間がかかる場合があります。";
export const WASM_CONTEXT_ANALYZING_MESSAGE = "WebGPUを使わず、CPUで文脈リスクを確認しています。";

export interface WasmContextSegment {
  surface: string;
}

export interface WasmContextEmbeddingRuntime {
  embed(texts: readonly string[], onProgress?: (progress: LlmProgress) => void): Promise<number[][]>;
  dispose(): Promise<void>;
}

export interface WasmContextAnalyzerOptions {
  wasmRootUrl: string;
  maxInputChars?: number;
  maxSegments?: number;
  maxCandidates?: number;
  confidenceThreshold?: number;
}

interface SemanticRiskDefinition {
  category: Exclude<ContextRiskCategory, "person_name" | "company_name" | "customer_name" | "project_name" | "other">;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  placeholderPrefix: string;
  prototype: string;
}

const semanticRiskDefinitions: readonly SemanticRiskDefinition[] = [
  {
    category: "contract_info",
    label: "契約情報候補",
    reason: "契約、見積、NDA、更新条件などの取引情報に近い文脈です。",
    riskLevel: "medium",
    placeholderPrefix: "CONTRACT_INFO",
    prototype: "契約条件、見積、NDA、契約更新など外部共有前に確認したい取引情報"
  },
  {
    category: "hr_info",
    label: "採用・人事情報候補",
    reason: "候補者評価、採用判断、給与、退職などの人事情報に近い文脈です。",
    riskLevel: "medium",
    placeholderPrefix: "HR_INFO",
    prototype: "候補者の面談評価、採用判断、給与条件、退職理由、人事評価などの人事情報"
  },
  {
    category: "legal_info",
    label: "法務情報候補",
    reason: "契約書、紛争、法務相談などの法務情報に近い文脈です。",
    riskLevel: "medium",
    placeholderPrefix: "LEGAL_INFO",
    prototype: "契約書レビュー、訴訟、紛争、弁護士相談、法的見解などの法務情報"
  },
  {
    category: "financial_info",
    label: "金融・条件情報候補",
    reason: "予算、原価、粗利、請求条件などの社内数値に近い文脈です。",
    riskLevel: "medium",
    placeholderPrefix: "FINANCIAL_INFO",
    prototype: "予算、原価、粗利、単価、請求条件、売上見込みなどの非公開財務情報"
  },
  {
    category: "internal_info",
    label: "社内情報候補",
    reason: "社内だけで扱う業務情報に近い文脈です。",
    riskLevel: "medium",
    placeholderPrefix: "INTERNAL_INFO",
    prototype: "社内会議、役員会、内部方針、社内限定など組織内だけで扱う業務情報"
  },
  {
    category: "confidential_context",
    label: "未公開・社外秘文脈候補",
    reason: "正式発表前、外部共有禁止などの未公開情報に近い文脈です。",
    riskLevel: "medium",
    placeholderPrefix: "CONFIDENTIAL_CONTEXT",
    prototype: "正式発表前、未公開、口外禁止、社外共有禁止など外部へ出せない秘密情報"
  }
] as const;

const segmentPattern = /[^\n。！？]+(?:[。！？]|$)/gu;

function normalizeVector(vector: readonly number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / norm);
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return -1;
  }
  const normalizedLeft = normalizeVector(left);
  const normalizedRight = normalizeVector(right);
  return normalizedLeft.reduce((sum, value, index) => sum + value * (normalizedRight[index] ?? 0), 0);
}

function confidenceFromSimilarity(similarity: number, threshold: number): number {
  const normalized = 0.7 + ((similarity - threshold) / Math.max(1 - threshold, 0.01)) * 0.25;
  return Math.max(0.7, Math.min(0.95, normalized));
}

export function splitWasmContextSegments(
  input: string,
  options: { maxInputChars?: number; maxSegments?: number } = {}
): WasmContextSegment[] {
  const maxInputChars = options.maxInputChars ?? 1200;
  const maxSegments = options.maxSegments ?? 8;
  const limitedInput = input.slice(0, maxInputChars);
  const segments: WasmContextSegment[] = [];
  const seen = new Set<string>();

  for (const match of limitedInput.matchAll(segmentPattern)) {
    const surface = match[0].trim().slice(0, 240);
    if (surface.length < 6 || seen.has(surface)) {
      continue;
    }
    seen.add(surface);
    segments.push({ surface });
    if (segments.length >= maxSegments) {
      break;
    }
  }

  return segments;
}

export function getWasmContextPrototypeTexts(): string[] {
  return semanticRiskDefinitions.map((definition) => `query: ${definition.prototype}`);
}

export function createWasmContextCandidates(options: {
  input: string;
  segments: WasmContextSegment[];
  segmentEmbeddings: number[][];
  prototypeEmbeddings: number[][];
  confidenceThreshold?: number;
  maxCandidates?: number;
}): ContextRiskCandidate[] {
  const threshold = options.confidenceThreshold ?? 0.82;
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const semanticCandidates: ContextRiskCandidate[] = [];
  const categoryCounters = new Map<ContextRiskCategory, number>();

  for (const [segmentIndex, segment] of options.segments.entries()) {
    const segmentEmbedding = options.segmentEmbeddings[segmentIndex];
    if (!segmentEmbedding) {
      continue;
    }

    let bestDefinition: SemanticRiskDefinition | undefined;
    let bestSimilarity = -1;
    for (const [definitionIndex, definition] of semanticRiskDefinitions.entries()) {
      const prototypeEmbedding = options.prototypeEmbeddings[definitionIndex];
      if (!prototypeEmbedding) {
        continue;
      }
      const similarity = cosineSimilarity(segmentEmbedding, prototypeEmbedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestDefinition = definition;
      }
    }

    if (!bestDefinition || bestSimilarity < threshold) {
      continue;
    }

    const count = (categoryCounters.get(bestDefinition.category) ?? 0) + 1;
    categoryCounters.set(bestDefinition.category, count);
    semanticCandidates.push({
      id: `wasm-context-${bestDefinition.category}-${count}`,
      category: bestDefinition.category,
      surface: segment.surface,
      label: bestDefinition.label,
      reason: `${bestDefinition.reason} CPU上の小型モデルによる補助候補です。`,
      riskLevel: bestDefinition.riskLevel,
      suggestedPlaceholder: `[${bestDefinition.placeholderPrefix}_${count}]`,
      confidence: confidenceFromSimilarity(bestSimilarity, threshold)
    });
  }

  return mergeResidualContextCandidates(options.input, semanticCandidates, { maxCandidates });
}
