import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success:
    "bg-success-container text-on-success-container",
  warning:
    "bg-warning-container text-on-warning-container",
  error:
    "bg-error-container text-on-error-container",
  info: "bg-info-container text-on-info-container",
  neutral: "bg-surface-deep text-muted",
};

type Props = {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
};

export default function StatusBadge({
  tone = "neutral",
  children,
  className = "",
}: Props) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
