import type { ReactNode } from "react";

export function Surface({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-line bg-white/90 shadow-soft ${className}`}>
      {children}
    </div>
  );
}
