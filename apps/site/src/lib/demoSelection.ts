import type { Finding } from "@ai-mae-check/core";

export function toggleSelectedId(currentIds: string[], id: string): string[] {
  return currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id];
}

export function createInitialSelectedFindingIds(findings: Finding[]): string[] {
  return findings.map((finding) => finding.id);
}
