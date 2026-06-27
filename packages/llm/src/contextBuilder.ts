import type { Finding } from "@ai-mae-check/core";
import { DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_INPUT_CHARS } from "./constants";
import type {
  ContextCheckPlan,
  ContextCheckPlanOptions,
  ContextHintReason,
  ContextHintResult,
  ContextWindow
} from "./types";

const MIN_CONTEXT_CHECK_CHARS = 40;
const DEFAULT_CONTEXT_WINDOW_CHARS = 360;
const MIN_CONTEXT_SCORE_TO_OFFER = 2;

type SignalSource = "finding" | "term" | "fallback";

interface ContextSignal {
  start: number;
  end: number;
  reason: ContextHintReason;
  score: number;
  source: SignalSource;
}

interface ContextSpan {
  start: number;
  end: number;
  reason: ContextHintReason;
  score: number;
}

const contextTerms: Array<{ reason: ContextHintReason; score: number; terms: string[] }> = [
  {
    reason: "near_confidential_hint",
    score: 3,
    terms: [
      "nda",
      "confidential",
      "社外秘",
      "秘密",
      "取扱注意",
      "関係者限り",
      "未公開",
      "口外禁止",
      "正式発表前",
      "発表前",
      "外には出さない",
      "社外共有",
      "社内だけ",
      "社内限り",
      "法務",
      "法務確認"
    ]
  },
  {
    reason: "near_business_context",
    score: 2,
    terms: ["顧客", "提案", "見積", "契約", "契約更新", "役員会", "案件", "プロジェクト"]
  },
  {
    reason: "near_money",
    score: 2,
    terms: ["給与", "年収", "年収条件", "月額", "年額", "初期費用", "契約金額", "見積金額", "粗利", "原価", "予算", "単価", "請求条件", "万円", "円"]
  },
  {
    reason: "near_person_like",
    score: 2,
    terms: ["採用", "候補者", "面談", "最終面談評価", "評価メモ", "退職理由", "内定", "内定前"]
  }
];

const personLikePattern = /[\p{Script=Han}々〆ヵヶ]{1,6}(?:様|さん|氏|先生|くん|ちゃん)/gu;
const moneyPattern = /(?:¥\s?\d[\d,]*|\d[\d,]*(?:円|万円))/gu;

function uniqueReasons(signals: ContextSignal[]): ContextHintReason[] {
  return [...new Set(signals.map((signal) => signal.reason))];
}

function scoreSignals(signals: ContextSignal[]): number {
  const strongestByReason = new Map<ContextHintReason, number>();

  for (const signal of signals) {
    strongestByReason.set(signal.reason, Math.max(strongestByReason.get(signal.reason) ?? 0, signal.score));
  }

  return [...strongestByReason.values()].reduce((total, score) => total + score, 0);
}

function reasonForFinding(finding: Finding): ContextHintReason {
  if (finding.category === "secret" || finding.riskLevel === "high" || finding.riskLevel === "critical") {
    return "near_secret";
  }

  if (finding.category === "financial") {
    return "near_money";
  }

  if (finding.category === "person") {
    return "near_person_like";
  }

  if (finding.category === "legal") {
    return "near_confidential_hint";
  }

  return "near_business_context";
}

function scoreForFinding(finding: Finding): number {
  if (finding.category === "secret" || finding.riskLevel === "critical") {
    return 5;
  }
  if (finding.riskLevel === "high") {
    return 4;
  }
  if (finding.riskLevel === "medium") {
    return 2;
  }
  return 1;
}

function collectFindingSignals(input: string, findings: Finding[]): ContextSignal[] {
  return findings
    .filter((finding) => finding.start >= 0 && finding.end > finding.start && finding.start < input.length)
    .map((finding) => ({
      start: finding.start,
      end: Math.min(finding.end, input.length),
      reason: reasonForFinding(finding),
      score: scoreForFinding(finding),
      source: "finding"
    }));
}

function collectTermSignals(input: string): ContextSignal[] {
  const normalized = input.toLowerCase();
  const signals: ContextSignal[] = [];

  for (const group of contextTerms) {
    for (const term of group.terms) {
      const searchTerm = term.toLowerCase();
      let cursor = 0;
      while (cursor < normalized.length) {
        const start = normalized.indexOf(searchTerm, cursor);
        if (start === -1) {
          break;
        }
        signals.push({
          start,
          end: start + term.length,
          reason: group.reason,
          score: group.score,
          source: "term"
        });
        cursor = start + Math.max(1, term.length);
      }
    }
  }

  for (const match of input.matchAll(personLikePattern)) {
    signals.push({
      start: match.index,
      end: match.index + match[0].length,
      reason: "near_person_like",
      score: 2,
      source: "term"
    });
  }

  for (const match of input.matchAll(moneyPattern)) {
    signals.push({
      start: match.index,
      end: match.index + match[0].length,
      reason: "near_money",
      score: 2,
      source: "term"
    });
  }

  return signals;
}

function collectContextSignals(input: string, findings: Finding[]): ContextSignal[] {
  return [...collectFindingSignals(input, findings), ...collectTermSignals(input)].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.start - right.start;
  });
}

function toSpan(signal: ContextSignal, inputLength: number, windowChars: number): ContextSpan {
  const padding = Math.max(40, Math.floor(windowChars / 2));
  return {
    start: Math.max(0, signal.start - padding),
    end: Math.min(inputLength, signal.end + padding),
    reason: signal.reason,
    score: signal.score
  };
}

function overlaps(left: ContextSpan, right: ContextSpan): boolean {
  return left.start <= right.end && right.start <= left.end;
}

function mergeSpans(spans: ContextSpan[]): ContextSpan[] {
  const sorted = [...spans].sort((left, right) => left.start - right.start || right.score - left.score);
  const merged: ContextSpan[] = [];

  for (const span of sorted) {
    const previous = merged.at(-1);
    if (!previous || !overlaps(previous, span)) {
      merged.push({ ...span });
      continue;
    }

    previous.end = Math.max(previous.end, span.end);
    if (span.score > previous.score) {
      previous.reason = span.reason;
      previous.score = span.score;
    }
  }

  return merged;
}

function normalizeWindowText(text: string): string {
  return text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function createWindows(input: string, signals: ContextSignal[], options: Required<Pick<ContextCheckPlanOptions, "maxInputChars" | "windowChars">>): ContextWindow[] {
  const spans = mergeSpans(signals.map((signal) => toSpan(signal, input.length, options.windowChars))).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.start - right.start;
  });

  const windows: ContextWindow[] = [];
  let usedChars = 0;

  for (const span of spans) {
    const remainingChars = options.maxInputChars - usedChars;
    if (remainingChars <= 0) {
      break;
    }

    const text = normalizeWindowText(input.slice(span.start, span.end).slice(0, remainingChars));
    if (text.length === 0 || windows.some((window) => window.text === text)) {
      continue;
    }

    windows.push({ text, reason: span.reason });
    usedChars += text.length;
  }

  return windows;
}

function createFallbackWindow(input: string, maxInputChars: number, windowChars: number): ContextWindow[] {
  const text = normalizeWindowText(input.slice(0, Math.min(maxInputChars, windowChars)));
  return text.length > 0 ? [{ text, reason: "near_business_context" }] : [];
}

export function evaluateContextHint(input: string, options: Pick<ContextCheckPlanOptions, "existingFindings"> = {}): ContextHintResult {
  const trimmed = input.trim();
  const existingFindings = options.existingFindings ?? [];
  if (trimmed.length < MIN_CONTEXT_CHECK_CHARS && existingFindings.length === 0) {
    return {
      shouldOffer: false,
      score: 0,
      reasons: []
    };
  }

  const signals = collectContextSignals(input, existingFindings);
  const score = scoreSignals(signals);

  return {
    shouldOffer: score >= MIN_CONTEXT_SCORE_TO_OFFER,
    score,
    reasons: uniqueReasons(signals)
  };
}

export function buildContextCheckPlan(input: string, options: ContextCheckPlanOptions = {}): ContextCheckPlan {
  const maxInputChars = options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;
  const windowChars = options.windowChars ?? DEFAULT_CONTEXT_WINDOW_CHARS;
  const existingFindings = options.existingFindings ?? [];
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const signals = collectContextSignals(input, existingFindings);
  const windows = createWindows(input, signals, { maxInputChars, windowChars });

  return {
    windows: windows.length > 0 ? windows : createFallbackWindow(input, maxInputChars, windowChars),
    existingFindings,
    maxCandidates
  };
}

export function createContextCheckInput(plan: ContextCheckPlan): string {
  return plan.windows.map((window) => window.text).join("\n\n---\n\n");
}
