import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "solid" | "outline";

type Props = {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  className?: string;
};

const variantClasses: Record<Variant, string> = {
  solid: "bg-[var(--color-primary)] text-[var(--color-background)] hover:opacity-90",
  outline:
    "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-background)]",
};

export default function PrimaryButton({
  children,
  href,
  variant = "solid",
  type,
  disabled,
  className = "",
}: Props) {
  const sharedClasses = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${variantClasses[variant]} ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={sharedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={sharedClasses}>
      {children}
    </button>
  );
}
