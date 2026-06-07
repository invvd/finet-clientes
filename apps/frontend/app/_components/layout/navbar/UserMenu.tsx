"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "../../../_lib/auth";

export default function UserMenu() {
  const { cliente, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setLogoutError(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setLogoutError(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(false);

    const ok = await logout();

    if (!ok) {
      setLoggingOut(false);
      setLogoutError(true);
      return;
    }

    setIsOpen(false);
    router.push("/inicio-sesion");
  }

  if (!cliente) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <div className="inline-flex items-center rounded-full bg-[var(--color-primary)] text-sm font-medium text-[var(--color-background)]">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-full pl-4 py-2 hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <User size={16} aria-hidden />
          Portal Cliente
        </Link>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Abrir menu de usuario"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
            if (!isOpen) setLogoutError(false);
          }}
          className="inline-flex items-center rounded-full pr-2 py-2 pl-0 hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {isOpen && (
        <ul
          className="absolute right-0 top-full mt-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-1 shadow-lg z-50"
          role="menu"
        >
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

          {logoutError && (
            <li role="none" className="px-3 py-2">
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <p className="flex items-start gap-1.5">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
                  No fue posible cerrar la sesión. Intenta nuevamente.
                </p>
              </div>
            </li>
          )}

          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut}
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={16} aria-hidden />
              {loggingOut ? "Cerrando sesión..." : logoutError ? "Reintentar" : "Cerrar sesión"}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
