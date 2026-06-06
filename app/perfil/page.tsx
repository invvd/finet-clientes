"use client";

import { useEffect, useState, useCallback } from "react";
import { User, AlertCircle, RefreshCw } from "lucide-react";

type ClientePerfil = {
  id_cliente: number;
  nombre_completo: string;
  rut: string;
  email: string;
  telefono: string;
  fecha_creacion: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPerfil = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`${API_URL}/auth/perfil`, {
        credentials: "include",
      });

      if (!res.ok) throw res;

      const data = await res.json();
      setPerfil(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPerfil(), 0);
    return () => clearTimeout(t);
  }, [fetchPerfil]);

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatRut(rut: string) {
    const body = rut.slice(0, -1);
    const dv = rut.slice(-1);
    const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${dotted}-${dv}`;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <User size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Mis Datos Personales
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Información de tu cuenta
          </p>
        </div>
      </div>

      {loading && (
        <div className="border border-[var(--color-border)] rounded-xl p-6 bg-[var(--color-background)]">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-48 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-40 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-36 rounded bg-[var(--color-border)]" />
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-500/20 bg-red-50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium text-red-700">
                No se pudo cargar la información
              </p>
              <p className="mt-1 text-sm text-red-600">
                Ocurrió un error al consultar tus datos. Intenta nuevamente.
              </p>
              <button
                type="button"
                onClick={fetchPerfil}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 transition-colors"
              >
                <RefreshCw size={14} aria-hidden />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {perfil && (
        <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-background)] divide-y divide-[var(--color-border)]">
          <div className="flex items-center gap-3 p-5">
            <span className="text-sm text-[var(--color-muted)] w-28 shrink-0">
              Nombre
            </span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {perfil.nombre_completo}
            </span>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="text-sm text-[var(--color-muted)] w-28 shrink-0">
              RUT
            </span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {formatRut(perfil.rut)}
            </span>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="text-sm text-[var(--color-muted)] w-28 shrink-0">
              Email
            </span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {perfil.email}
            </span>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="text-sm text-[var(--color-muted)] w-28 shrink-0">
              Teléfono
            </span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {perfil.telefono || "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="text-sm text-[var(--color-muted)] w-28 shrink-0">
              Cliente desde
            </span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {formatFecha(perfil.fecha_creacion)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
