import {
  classifyLlmErrorSignal,
  isJsonParseLlmErrorMessage as isJsonParseSignalMessage,
  type LlmErrorSignal
} from "./errorSignals";
import type { ContextAnalysisResult, LlmErrorDetail } from "./types";
export { createJsonParseFallbackMessage, isJsonParseLlmErrorMessage } from "./errorSignals";

type ErrorWithLlmErrorDetail = Error & {
  llmErrorDetail: LlmErrorDetail;
};

export function createLlmErrorDetailError(detail: LlmErrorDetail): ErrorWithLlmErrorDetail {
  const error = new Error(detail.message) as ErrorWithLlmErrorDetail;
  error.name = detail.kind;
  error.llmErrorDetail = detail;
  return error;
}

function getEmbeddedLlmErrorDetail(error: unknown): LlmErrorDetail | null {
  if (!error || typeof error !== "object" || !("llmErrorDetail" in error)) {
    return null;
  }

  const detail = (error as { llmErrorDetail?: unknown }).llmErrorDetail;
  if (!detail || typeof detail !== "object") {
    return null;
  }

  const candidate = detail as Partial<LlmErrorDetail>;
  return typeof candidate.kind === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.hint === "string"
    ? (candidate as LlmErrorDetail)
    : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

const REDACTED_TECHNICAL_DETAIL = "[redacted]";
const TECHNICAL_DETAIL_FIELD_PATTERN =
  /\b(prompt|input|content|body|user(?:\s+(?:text|message))?)\s*[:=]\s*("[^"]*"|'[^']*'|`[^`]*`|.+?)(?=(?:\s+\w+\s*[:=])|$)/gi;
const LONG_QUOTED_SEGMENT_PATTERN = /"[^"]{24,}"|'[^']{24,}'|`[^`]{24,}`/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JAPAN_PHONE_PATTERN = /\b0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}\b/g;
const SECRET_LIKE_PATTERN =
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[opusr]_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/gi;
const TECHNICAL_DETAIL_TOKEN_PATTERN = /[A-Za-z0-9][A-Za-z0-9_-]{3,}|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆〤]{2,}/gu;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactCommonSensitivePatterns(message: string): string {
  return message
    .replace(EMAIL_PATTERN, REDACTED_TECHNICAL_DETAIL)
    .replace(JAPAN_PHONE_PATTERN, REDACTED_TECHNICAL_DETAIL)
    .replace(SECRET_LIKE_PATTERN, REDACTED_TECHNICAL_DETAIL);
}

function redactSourceTextFragments(message: string, sourceText?: string): string {
  if (!sourceText) {
    return message;
  }

  const tokens = new Set(message.match(TECHNICAL_DETAIL_TOKEN_PATTERN) ?? []);
  let redacted = message;

  for (const token of tokens) {
    if (sourceText.includes(token)) {
      redacted = redacted.replace(new RegExp(escapeRegExp(token), "g"), REDACTED_TECHNICAL_DETAIL);
    }
  }

  return redacted;
}

function sanitizeSensitiveSegments(message: string, sourceText?: string): string {
  const redactedFields = message.replace(
    TECHNICAL_DETAIL_FIELD_PATTERN,
    (_match: string, label: string) => `${label}: ${REDACTED_TECHNICAL_DETAIL}`
  );

  return redactSourceTextFragments(
    redactCommonSensitivePatterns(redactedFields.replace(LONG_QUOTED_SEGMENT_PATTERN, REDACTED_TECHNICAL_DETAIL)),
    sourceText
  );
}

function sanitizeTechnicalDetail(message: string, sourceText?: string): string | undefined {
  const normalized = sanitizeSensitiveSegments(message, sourceText).replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.slice(0, 260);
}

function sanitizeRequiredDisplayText(message: string, sourceText?: string): string {
  return sanitizeSensitiveSegments(message, sourceText).replace(/\s+/g, " ").trim() || REDACTED_TECHNICAL_DETAIL;
}

function detail(signal: LlmErrorSignal, rawMessage: string): LlmErrorDetail {
  const technicalDetail = sanitizeTechnicalDetail(rawMessage);
  return {
    ...signal,
    ...(technicalDetail ? { technicalDetail } : {})
  };
}

export function sanitizeLlmErrorDetail(detail: LlmErrorDetail, sourceText?: string): LlmErrorDetail {
  const technicalDetail = detail.technicalDetail ? sanitizeTechnicalDetail(detail.technicalDetail, sourceText) : undefined;
  return {
    kind: detail.kind,
    message: sanitizeRequiredDisplayText(detail.message, sourceText),
    hint: sanitizeRequiredDisplayText(detail.hint, sourceText),
    ...(technicalDetail ? { technicalDetail } : {})
  };
}

export function classifyLlmError(error: unknown): LlmErrorDetail {
  const embeddedDetail = getEmbeddedLlmErrorDetail(error);
  if (embeddedDetail) {
    return sanitizeLlmErrorDetail(embeddedDetail);
  }

  const message = errorMessage(error);
  return detail(classifyLlmErrorSignal(message), message);
}

export function formatLlmErrorMessage(error: unknown): string {
  return classifyLlmError(error).message;
}

export function isContextAnalysisExecutionError(result: Pick<ContextAnalysisResult, "error" | "errorDetail">): boolean {
  if (!result.error) {
    return false;
  }

  return result.errorDetail?.kind !== "json_parse" && !isJsonParseSignalMessage(result.error);
}
