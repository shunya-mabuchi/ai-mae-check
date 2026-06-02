import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonClassByVariant: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-white shadow-soft hover:bg-[#343638]",
  secondary: "border-leaf bg-leaf text-white shadow-soft hover:bg-[#276848]",
  ghost: "border-line bg-white/75 text-ink hover:bg-white"
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-card border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${buttonClassByVariant[variant]}`}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <p className="mb-3 text-sm font-bold text-leaf">{eyebrow}</p>
      <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink md:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-muted md:text-lg">{description}</p>}
    </div>
  );
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface shadow-soft ${className}`}>{children}</div>;
}
