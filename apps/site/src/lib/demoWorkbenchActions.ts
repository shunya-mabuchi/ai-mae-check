import type { LlmStatus } from "./demoConstants";

export type DemoWorkbenchActionId =
  | "sample_rules"
  | "sample_context"
  | "detect_rules"
  | "check_context"
  | "copy_masked"
  | "reset";

export type DemoWorkbenchActionIcon = "clipboard" | "sparkles" | "shield_check" | "wand" | "refresh";

export type DemoWorkbenchActionVariant = "primary" | "secondary" | "ghost";

export interface DemoWorkbenchActionViewModel {
  id: DemoWorkbenchActionId;
  label: string;
  icon: DemoWorkbenchActionIcon;
  variant: DemoWorkbenchActionVariant;
  className: string;
  disabled: boolean;
}

export interface DemoWorkbenchActionOptions {
  llmStatus: LlmStatus;
  hasMaskedText: boolean;
}

const headerGhostClassName = "w-full border-white/20 bg-white/10 text-white hover:bg-white/15 lg:w-auto";
const headerPrimaryGhostClassName = "w-full border-white/20 bg-white text-ink hover:bg-cloud lg:w-auto";
const headerSecondaryClassName = "w-full lg:w-auto";

export function isDemoLlmBusy(status: LlmStatus): boolean {
  return status === "loading" || status === "analyzing";
}

export function createDemoWorkbenchActions(options: DemoWorkbenchActionOptions): DemoWorkbenchActionViewModel[] {
  return [
    {
      id: "sample_rules",
      label: "ルール用サンプル",
      icon: "clipboard",
      variant: "ghost",
      className: headerGhostClassName,
      disabled: false
    },
    {
      id: "sample_context",
      label: "文脈用サンプル",
      icon: "sparkles",
      variant: "ghost",
      className: headerGhostClassName,
      disabled: false
    },
    {
      id: "detect_rules",
      label: "検出する",
      icon: "shield_check",
      variant: "secondary",
      className: headerSecondaryClassName,
      disabled: false
    },
    {
      id: "check_context",
      label: "AI文脈チェック",
      icon: "sparkles",
      variant: "ghost",
      className: headerPrimaryGhostClassName,
      disabled: isDemoLlmBusy(options.llmStatus)
    },
    {
      id: "copy_masked",
      label: "コピー",
      icon: "wand",
      variant: "ghost",
      className: headerGhostClassName,
      disabled: !options.hasMaskedText
    },
    {
      id: "reset",
      label: "リセット",
      icon: "refresh",
      variant: "ghost",
      className: headerGhostClassName,
      disabled: false
    }
  ];
}
