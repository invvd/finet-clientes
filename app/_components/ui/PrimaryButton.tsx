import Link from 'next/link';

type Variant = 'solid' | 'outline';

type Props = {
  children: React.ReactNode;
  href: string;
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  solid:
    'bg-[var(--color-primary)] text-white hover:opacity-90',
  outline:
    'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white',
};

export default function PrimaryButton({ children, href, variant = 'solid' }: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${variantClasses[variant]}`}
    >
      {children}
    </Link>
  );
}
