import {
  createSafeTextContent,
  createSafeTextFileName,
  detectSensitiveText,
  evaluateDlpPolicy,
  getTextFilePreflightKind,
  type DetectionResult,
  type DlpPolicyDecision,
  type TextFilePreflightKind
} from "@ai-mae-check/core";
import { showFilePreflightModal, type FilePreflightModalItem } from "../../ui/fileModal";

export interface FileDescriptor {
  name: string;
  type: string;
  size: number;
}

export interface FilePreflightDescription extends FileDescriptor {
  kind: TextFilePreflightKind;
  inspectable: boolean;
}

interface InspectedTextFile {
  file: File;
  text: string;
  detection: DetectionResult;
  policy: DlpPolicyDecision;
  safeFileName: string;
}

export interface FileInterceptorOptions {
  isEnabled: () => boolean;
  disabledRuleIds: () => string[];
}

export function describeFileForPreflight(file: FileDescriptor): FilePreflightDescription {
  const kind = getTextFilePreflightKind(file.name);

  return {
    ...file,
    kind,
    inspectable: kind === "supported_text"
  };
}

function isFileInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === "file";
}

function detectFileText(text: string, disabledRuleIds: string[]): DetectionResult {
  return detectSensitiveText(text, disabledRuleIds.length > 0 ? { disabledRuleIds } : {});
}

async function inspectFile(file: File, disabledRuleIds: string[]): Promise<InspectedTextFile> {
  const text = await file.text();
  const detection = detectFileText(text, disabledRuleIds);

  return {
    file,
    text,
    detection,
    policy: evaluateDlpPolicy(detection.findings),
    safeFileName: createSafeTextFileName(file.name)
  };
}

function toModalItem(result: InspectedTextFile): FilePreflightModalItem {
  return {
    fileName: result.file.name,
    size: result.file.size,
    detection: result.detection,
    policy: result.policy,
    safeFileName: result.safeFileName
  };
}

function replaceInputFiles(input: HTMLInputElement, files: File[]): void {
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }

  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function createSafeFile(result: InspectedTextFile): File {
  const safeText = createSafeTextContent(result.text, result.detection.findings);
  return new File([safeText], result.safeFileName, {
    type: result.file.type || "text/plain",
    lastModified: Date.now()
  });
}

export function installFileInterceptor(options: FileInterceptorOptions): () => void {
  const bypassInputs = new WeakSet<HTMLInputElement>();

  const handleChange = (event: Event) => {
    if (!options.isEnabled() || !isFileInput(event.target) || !event.target.files) {
      return;
    }

    const input = event.target;
    if (bypassInputs.has(input)) {
      bypassInputs.delete(input);
      return;
    }

    void handleFileInputChange(input, options, bypassInputs);
  };

  document.addEventListener("change", handleChange, true);

  return () => {
    document.removeEventListener("change", handleChange, true);
  };
}

async function handleFileInputChange(
  input: HTMLInputElement,
  options: FileInterceptorOptions,
  bypassInputs: WeakSet<HTMLInputElement>
): Promise<void> {
  const files = Array.from(input.files ?? []);
  if (files.length === 0) {
    return;
  }

  const descriptions = files.map((file) => describeFileForPreflight(file));
  const inspectableFiles = files.filter((file) => describeFileForPreflight(file).inspectable);
  if (inspectableFiles.length === 0) {
    return;
  }

  let inspected: InspectedTextFile[];
  try {
    inspected = await Promise.all(inspectableFiles.map((file) => inspectFile(file, options.disabledRuleIds())));
  } catch {
    input.value = "";
    return;
  }

  const riskyFiles = inspected.filter((result) => result.detection.findings.length > 0);
  if (riskyFiles.length === 0) {
    return;
  }

  const unsupportedFileNames = descriptions
    .filter((description) => description.kind === "unsupported_binary")
    .map((description) => description.name);
  const canAttachRaw = riskyFiles.every((result) => result.policy.canSendRaw);
  const decision = await showFilePreflightModal({
    items: riskyFiles.map(toModalItem),
    unsupportedFileNames,
    canAttachRaw
  });

  if (decision === "allow_raw" && canAttachRaw) {
    return;
  }

  if (decision !== "safe") {
    input.value = "";
    return;
  }

  const inspectedByFile = new Map<File, InspectedTextFile>(inspected.map((result) => [result.file, result]));
  const nextFiles = files.map((file) => {
    const result = inspectedByFile.get(file);
    return result && result.detection.findings.length > 0 ? createSafeFile(result) : file;
  });

  bypassInputs.add(input);
  replaceInputFiles(input, nextFiles);
}
