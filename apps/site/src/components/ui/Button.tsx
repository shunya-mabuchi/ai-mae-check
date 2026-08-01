import type { ReactNode } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps
} from "react-aria-components/Button";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonClassByVariant: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-white shadow-soft data-[hovered]:bg-[#343638]",
  secondary: "border-leaf bg-leaf text-white shadow-soft data-[hovered]:bg-[#276848]",
  ghost: "border-line bg-white/75 text-ink data-[hovered]:bg-white"
};

export interface ButtonProps extends Omit<AriaButtonProps, "children" | "className"> {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2 text-sm font-semibold tracking-normal transition data-[pressed]:translate-y-px data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal data-[focus-visible]:ring-offset-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0 ${buttonClassByVariant[variant]} ${className}`}
    >
      {children}
    </AriaButton>
  );
}
