"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../utils/api";

type Ticket = {
  id_ticket: number;
  codigo_seguimiento: string;
  estado: string;
  prioridad: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_cierre: string | null;
  categoria: string;
  origen: string;
};

type TicketsData = {
  total: number;
  tiene_tickets: boolean;
  tickets: Ticket[];
};

function estadoBadge(estado: string) {
  const map: Record<string, { label: string; className: string }> = {
    abierto: {
      label: "Abierto",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    en_progreso: {
      label: "En progreso",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    cerrado: {
      label: "Cerrado",
      className: "bg-green-100 text-green-700 border-green-200",
    },
  };
  return map[estado] ?? { label: estado, className: "bg-gray-100 text-gray-600 border-gray-200" };
}

function prioridadBadge(prioridad: string) {
  const map: Record<string, { label: string; className: string }> = {
    alta: {
      label: "Alta",
      className: "bg-red-100 text-red-700 border-red-200",
    },
    media: {
      label: "Media",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    baja: {
      label: "Baja",
      className: "bg-green-100 text-green-700 border-green-200",
    },
  };
  return map[prioridad] ?? { label: prioridad, className: "bg-gray-100 text-gray-600 border-gray-200" };
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TicketsPage() {
  const [data, setData] = useState<TicketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const json = await api.get<TicketsData>("/portal/tickets");
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchTickets(), 0);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <MessageSquare size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Tickets de Soporte
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Historial de tus solicitudes
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-[var(--color-border)] rounded-xl p-5 bg-[var(--color-background)] animate-pulse"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-24 rounded bg-[var(--color-border)]" />
                <div className="h-4 w-16 rounded bg-[var(--color-border)]" />
                <div className="h-4 w-12 rounded bg-[var(--color-border)]" />
              </div>
              <div className="h-3 w-32 rounded bg-[var(--color-border)] mb-2" />
              <div className="h-3 w-64 rounded bg-[var(--color-border)]" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-red-500/20 bg-red-50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium text-red-700">
                No se pudo cargar el historial
              </p>
              <p className="mt-1 text-sm text-red-600">
                La información de tickets no está disponible temporalmente.
              </p>
              <button
                type="button"
                onClick={fetchTickets}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 transition-colors"
              >
                <RefreshCw size={14} aria-hidden />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {data && !data.tiene_tickets && !loading && (
        <div className="border border-[var(--color-border)] rounded-xl p-8 bg-[var(--color-background)] text-center">
          <MessageSquare size={32} className="mx-auto text-[var(--color-muted)]" aria-hidden />
          <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
            Sin tickets
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            No tienes solicitudes de soporte registradas.
          </p>
        </div>
      )}

      {data && data.tiene_tickets && !loading && (
        <div className="space-y-3">
          {data.tickets.map((t) => {
            const estado = estadoBadge(t.estado);
            const prioridad = prioridadBadge(t.prioridad);
            return (
              <div
                key={t.id_ticket}
                className="border border-[var(--color-border)] rounded-xl p-5 bg-[var(--color-background)]"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t.codigo_seguimiento}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${estado.className}`}
                  >
                    {estado.label}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${prioridad.className}`}
                  >
                    {prioridad.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-1">
                  {t.categoria}
                </p>
                <p className="text-sm text-[var(--color-foreground)]">
                  {t.descripcion}
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {formatFecha(t.fecha_creacion)}
                  {t.fecha_cierre && ` — Cerrado: ${formatFecha(t.fecha_cierre)}`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
