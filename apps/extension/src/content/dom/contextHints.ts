import { evaluateContextHint } from "@ai-mae-check/llm";
import type { Finding } from "@ai-mae-check/core";

export function shouldOfferContextCheck(inputText: string, existingFindings: Finding[] = []): boolean {
  return evaluateContextHint(inputText, { existingFindings }).shouldOffer;
}
