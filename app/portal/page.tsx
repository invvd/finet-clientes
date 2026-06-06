"use client";

import { useAuth } from "../_lib/auth";
import { LayoutDashboard } from "lucide-react";

export default function PortalPage() {
  const { cliente } = useAuth();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <LayoutDashboard size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Bienvenido{cliente ? `, ${cliente.nombre_completo.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Resumen de tus servicios
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="border border-[var(--color-border)] rounded-xl p-6 bg-[var(--color-background)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            Mis Contratos
          </p>
          <p className="text-3xl font-extrabold text-[var(--color-foreground)]">
            —
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Próximamente
          </p>
        </div>
        <div className="border border-[var(--color-border)] rounded-xl p-6 bg-[var(--color-background)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            Mi Deuda
          </p>
          <p className="text-3xl font-extrabold text-[var(--color-foreground)]">
            —
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Próximamente
          </p>
        </div>
        <div className="border border-[var(--color-border)] rounded-xl p-6 bg-[var(--color-background)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            Tickets
          </p>
          <p className="text-3xl font-extrabold text-[var(--color-foreground)]">
            —
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Próximamente
          </p>
        </div>
      </div>
    </div>
  );
}
