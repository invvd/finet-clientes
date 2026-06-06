"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { User, LayoutDashboard, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../../_lib/auth";

export default function UserMenu() {
  const { cliente, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  async function handleLogout() {
    setIsOpen(false);
    await logout();
    router.push("/inicio-sesion");
  }

  if (!cliente) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-background)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <User size={16} aria-hidden />
        <span className="max-w-[120px] truncate">
          Hola, {cliente.nombre_completo.split(" ")[0]}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          className="absolute right-0 top-full mt-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-1 shadow-lg z-50"
          role="menu"
        >
          <li role="none">
            <Link
              href="/portal"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <LayoutDashboard size={16} aria-hidden />
              Mi Portal
            </Link>
          </li>
          <li role="none">
            <Link
              href="/perfil"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <User size={16} aria-hidden />
              Mi Perfil
            </Link>
          </li>
          <li
            role="separator"
            className="my-1 border-t border-[var(--color-border)]"
          />
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <LogOut size={16} aria-hidden />
              Cerrar sesión
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
