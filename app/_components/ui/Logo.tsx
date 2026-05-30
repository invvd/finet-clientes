import Image from 'next/image';
import Link from 'next/link';

type Size = 'sm' | 'md' | 'lg';

const dimensions: Record<Size, { width: number; height: number; className: string }> = {
  sm: { width: 80, height: 27, className: 'h-7 w-auto' },
  md: { width: 120, height: 40, className: 'h-10 w-auto' },
  lg: { width: 160, height: 53, className: 'h-14 w-auto' },
};

type Props = { size?: Size; href?: string };

export default function Logo({ size = 'md', href = '/' }: Props) {
  const { width, height, className } = dimensions[size];
  return (
    <Link href={href} className="inline-flex items-center">
      <Image
        src="/brand/FinetLogo.webp"
        alt="Finet — Internet y TV"
        width={width}
        height={height}
        className={className}
        priority
      />
    </Link>
  );
}
