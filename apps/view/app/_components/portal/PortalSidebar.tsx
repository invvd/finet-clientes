"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, CreditCard, MessageSquare, User, X } from "lucide-react";

const navItems = [
  { href: "/portal", label: "Panel", icon: LayoutDashboard },
  { href: "/portal/contratos", label: "Mis Contratos", icon: FileText },
  { href: "/portal/deuda", label: "Mi Deuda", icon: CreditCard },
  { href: "/portal/tickets", label: "Tickets", icon: MessageSquare },
  { href: "/perfil", label: "Mi Perfil", icon: User },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PortalSidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/perfil") return pathname.startsWith("/perfil");
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <nav aria-label="Navegacion del portal" className="flex flex-col gap-0.5 p-3">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Icon size={18} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:min-h-[calc(100vh-64px)] lg:border-r lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:shrink-0">
        <div className="px-3 pt-4 pb-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Portal Cliente
          </p>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--color-background)] border-r border-[var(--color-border)] shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-3 pt-4 pb-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Portal Cliente
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menu"
                className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
