"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { NavItem } from "./nav.config";

type MobileMenuProps = {
  items: NavItem[];
};

export default function MobileMenu({ items }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-controls="menu-movil"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Cerrar menu movil" : "Abrir menu movil"}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <nav
        id="menu-movil"
        aria-label="Navegacion principal movil"
        hidden={!isOpen}
        className="absolute left-0 right-0 top-full border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3"
      >
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
