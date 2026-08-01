import type { DetectionResult, DlpPolicyDecision } from "@ai-mae-check/core";

export interface FilePreflightModalItem {
  fileName: string;
  size: number;
  detection: DetectionResult;
  policy: DlpPolicyDecision;
  safeFileName: string;
}

export interface FilePreflightModalOptions {
  items: FilePreflightModalItem[];
  unsupportedFileNames: string[];
  canAttachRaw: boolean;
}

export type FilePreflightModalDecision = "safe" | "allow_raw" | "cancel";
