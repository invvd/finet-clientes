"use client";

import Link from 'next/link';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import NavLogo from './NavLogo';
import PortalClienteButton from './PortalClienteButton';
import ThemeToggle from './ThemeToggle';
import { navItems, audienceSwitch } from './nav.config';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl">
        {/* Top strip: audience switch + theme toggle */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-1.5 text-xs">
          <nav aria-label="Tipo de cliente">
            {/* TODO: leer pathname con usePathname() cuando exista la ruta /empresas */}
            <ul className="flex items-center gap-4">
              {audienceSwitch.map((item, i) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      i === 0
                        ? 'font-medium text-[var(--color-foreground)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
        </div>

        {/* Main bar: logo + nav + search + portal button */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <NavLogo />
            {/* Nav items - desktop */}
            <nav aria-label="Navegacion principal" className="hidden md:block">
              <ul className="flex items-center gap-5">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-0.5 text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      {item.label}
                      {item.children && (
                        <ChevronDown size={14} className="text-[var(--color-muted)]" aria-hidden />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Buscar"
              className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            >
              <Search size={18} />
            </button>
            <PortalClienteButton />
            <button
              type="button"
              aria-controls="menu-movil"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Cerrar menu movil' : 'Abrir menu movil'}
              className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer md:hidden"
              onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <nav
          id="menu-movil"
          aria-label="Navegacion principal movil"
          hidden={!isMobileMenuOpen}
          className="border-t border-[var(--color-border)] px-4 py-3 md:hidden"
        >
          <ul className="grid gap-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
