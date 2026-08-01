import type { ReactNode } from "react";
import { Check } from "lucide-react";
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps
} from "react-aria-components/Checkbox";

export interface SelectionCheckboxProps
  extends Omit<AriaCheckboxProps, "children" | "className"> {
  children: ReactNode;
  className?: string;
}

export function SelectionCheckbox({
  children,
  className = "",
  ...props
}: SelectionCheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={`group flex cursor-pointer items-start gap-3 rounded-card border border-line bg-white p-3 shadow-soft outline-hidden transition data-[hovered]:border-leaf/40 data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal data-[focus-visible]:ring-offset-2 ${className}`}
    >
      {({ isSelected }) => (
        <>
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-white text-white transition group-data-[selected]:border-leaf group-data-[selected]:bg-leaf"
            aria-hidden="true"
          >
            {isSelected ? <Check size={14} strokeWidth={3} /> : null}
          </span>
          <span className="min-w-0 flex-1">{children}</span>
        </>
      )}
    </AriaCheckbox>
  );
}
