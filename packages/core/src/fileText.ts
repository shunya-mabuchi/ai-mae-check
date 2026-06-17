import { transformText } from "./transform";
import type { Finding, TransformMode } from "./types";

export type TextFilePreflightKind = "supported_text" | "unsupported_binary" | "unknown";

export const supportedTextFileExtensions = [
  "txt",
  "md",
  "csv",
  "json",
  "yaml",
  "yml",
  "env",
  "log",
  "js",
  "ts",
  "py",
  "go",
  "rb",
  "java",
  "html",
  "xml"
] as const;

const supportedTextExtensionSet = new Set<string>(supportedTextFileExtensions);
const unsupportedBinaryExtensionSet = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "heic",
  "bmp"
]);

function extensionOf(fileName: string): string {
  const lowerName = fileName.toLowerCase().trim();
  const lastDot = lowerName.lastIndexOf(".");

  if (lastDot < 0 || lastDot === lowerName.length - 1) {
    return "";
  }

  return lowerName.slice(lastDot + 1);
}

export function isSupportedTextFileName(fileName: string): boolean {
  return supportedTextExtensionSet.has(extensionOf(fileName));
}

export function getTextFilePreflightKind(fileName: string): TextFilePreflightKind {
  const extension = extensionOf(fileName);

  if (supportedTextExtensionSet.has(extension)) {
    return "supported_text";
  }

  if (unsupportedBinaryExtensionSet.has(extension)) {
    return "unsupported_binary";
  }

  return "unknown";
}

export function createSafeTextFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot <= 0) {
    return `.safe${fileName.startsWith(".") ? fileName : `.${fileName}`}`;
  }

  return `${fileName.slice(0, lastDot)}.safe${fileName.slice(lastDot)}`;
}

export function createSafeTextContent(input: string, findings: Finding[], mode: TransformMode = "mask"): string {
  return transformText(input, findings, mode).transformedText;
}
