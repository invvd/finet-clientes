import Link from 'next/link';
import {
  CreditCard,
  Gauge,
  MapPin,
  User,
} from 'lucide-react';
import { footerColumns } from './footer.config';

const iconMap: Record<string, React.ReactNode> = {
  'credit-card': <CreditCard size={14} aria-hidden />,
  'gauge': <Gauge size={14} aria-hidden />,
  'map-pin': <MapPin size={14} aria-hidden />,
  'user': <User size={14} aria-hidden />,
};

export default function FooterNav() {
  return (
    <nav aria-label="Navegación del pie de página">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {footerColumns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
              {col.title}
            </h3>
            <ul className="space-y-2">
              {col.links.map((link) => {
                const isWhatsApp = link.icon === 'whatsapp';
                const isExternal = link.href.startsWith('http');

                return (
                  <li key={link.href}>
                    {isWhatsApp ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#075E54] px-3 py-1 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                      >
                        {link.icon && iconMap[link.icon]}
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
