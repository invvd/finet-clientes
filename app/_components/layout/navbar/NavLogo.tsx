import Image from 'next/image';
import Link from 'next/link';

export default function NavLogo() {
  return (
    <Link href="/" className="flex items-center shrink-0">
      <Image
        src="/brand/FinetLogo.webp"
        alt="Finet — Internet y TV"
        width={120}
        height={40}
        priority
        className="h-10 w-auto"
      />
    </Link>
  );
}
