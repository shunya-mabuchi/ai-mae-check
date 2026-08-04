import type { ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps
} from "react-aria-components/Button";
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps
} from "react-aria-components/Checkbox";
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps
} from "react-aria-components/RadioGroup";
import type { LlmRunMode } from "../../src/lib/settings";

type ButtonVariant = "primary" | "secondary";

const buttonClassByVariant: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-white data-[hovered]:bg-[#343638]",
  secondary: "border-line bg-white text-ink data-[hovered]:bg-paper"
};

interface OptionsButtonProps extends Omit<AriaButtonProps, "children" | "className"> {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

export function OptionsButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: OptionsButtonProps) {
  return (
    <AriaButton
      {...props}
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-bold outline-hidden transition data-[pressed]:translate-y-px data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal data-[focus-visible]:ring-offset-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55 ${buttonClassByVariant[variant]} ${className}`}
    >
      {children}
    </AriaButton>
  );
}

interface OptionsCheckboxProps
  extends Omit<AriaCheckboxProps, "children" | "className" | "isSelected" | "onChange"> {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  label: string;
  description?: string;
}

export function OptionsCheckbox({
  isSelected,
  onChange,
  label,
  description,
  ...props
}: OptionsCheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      isSelected={isSelected}
      onChange={onChange}
      className="group flex cursor-pointer items-start justify-between gap-4 rounded-md border border-line bg-white p-4 outline-hidden transition data-[hovered]:border-leaf/50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal data-[focus-visible]:ring-offset-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55"
    >
      {({ isSelected: selected }) => (
        <>
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{label}</span>
            {description ? <span className="mt-1 block text-sm leading-6 text-stone-600">{description}</span> : null}
          </span>
          <span
            aria-hidden="true"
            className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-white text-white transition group-data-[selected]:border-leaf group-data-[selected]:bg-leaf"
          >
            {selected ? <Check size={14} strokeWidth={3} /> : null}
          </span>
        </>
      )}
    </AriaCheckbox>
  );
}

interface LlmModeRadioGroupProps
  extends Omit<AriaRadioGroupProps, "children" | "className" | "value" | "onChange"> {
  value: LlmRunMode;
  onChange: (value: LlmRunMode) => void;
}

const llmModes: Array<{ value: LlmRunMode; label: string; description: string }> = [
  {
    value: "manual",
    label: "手動ボタンだけで実行",
    description: "モーダル内の「AI文脈チェックも実行」ボタンを押したときだけ実行します。"
  },
  {
    value: "auto",
    label: "自動で実行",
    description: "確認画面を開いたときにCPU文脈チェックを開始します。初回はモデル準備に時間がかかる場合があります。"
  }
];

export function LlmModeRadioGroup({ value, onChange, ...props }: LlmModeRadioGroupProps) {
  return (
    <AriaRadioGroup
      {...props}
      aria-label="AI文脈チェックの実行方法"
      value={value}
      onChange={(nextValue) => {
        if (nextValue === "manual" || nextValue === "auto") {
          onChange(nextValue);
        }
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {llmModes.map((mode) => (
        <AriaRadio
          key={mode.value}
          value={mode.value}
          className="group flex cursor-pointer items-start gap-3 rounded-md border border-line bg-white p-4 outline-hidden transition data-[hovered]:border-leaf/50 data-[selected]:border-leaf/60 data-[selected]:bg-[#f3faf6] data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal data-[focus-visible]:ring-offset-2"
        >
          {({ isSelected }) => (
            <>
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-white text-leaf transition group-data-[selected]:border-leaf"
              >
                {isSelected ? <Circle size={10} fill="currentColor" strokeWidth={0} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{mode.label}</span>
                <span className="mt-2 block text-sm leading-6 text-stone-600">{mode.description}</span>
              </span>
            </>
          )}
        </AriaRadio>
      ))}
    </AriaRadioGroup>
  );
}
