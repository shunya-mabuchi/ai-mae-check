import {
  classifyLlmErrorSignal,
  isJsonParseLlmErrorMessage as isJsonParseSignalMessage,
  type LlmErrorSignal
} from "./errorSignals";
import type { ContextAnalysisResult, LlmErrorDetail } from "./types";
export { createJsonParseFallbackMessage, isJsonParseLlmErrorMessage } from "./errorSignals";

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

function sanitizeSensitiveSegments(message: string): string {
  const redactedFields = message.replace(
    TECHNICAL_DETAIL_FIELD_PATTERN,
    (_match: string, label: string) => `${label}: ${REDACTED_TECHNICAL_DETAIL}`
  );

  return redactedFields.replace(LONG_QUOTED_SEGMENT_PATTERN, REDACTED_TECHNICAL_DETAIL);
}

function sanitizeTechnicalDetail(message: string): string | undefined {
  const normalized = sanitizeSensitiveSegments(message).replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.slice(0, 260);
}

function detail(signal: LlmErrorSignal, rawMessage: string): LlmErrorDetail {
  const technicalDetail = sanitizeTechnicalDetail(rawMessage);
  return {
    ...signal,
    ...(technicalDetail ? { technicalDetail } : {})
  };
}

export function classifyLlmError(error: unknown): LlmErrorDetail {
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
