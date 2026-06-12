"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../utils/api";
import StatusBadge, { type StatusTone } from "@/app/_components/ui/StatusBadge";

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

function estadoBadge(estado: string): { label: string; tone: StatusTone } {
  const map: Record<string, { label: string; tone: StatusTone }> = {
    abierto: { label: "Abierto", tone: "info" },
    en_progreso: { label: "En progreso", tone: "warning" },
    cerrado: { label: "Cerrado", tone: "success" },
  };
  return map[estado] ?? { label: estado, tone: "neutral" };
}

function prioridadBadge(prioridad: string): { label: string; tone: StatusTone } {
  const map: Record<string, { label: string; tone: StatusTone }> = {
    alta: { label: "Alta", tone: "error" },
    media: { label: "Media", tone: "warning" },
    baja: { label: "Baja", tone: "success" },
  };
  return map[prioridad] ?? { label: prioridad, tone: "neutral" };
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
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <MessageSquare size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Tickets de Soporte
          </h1>
          <p className="text-sm text-muted">
            Historial de tus solicitudes
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-5 bg-background animate-pulse"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-24 rounded bg-border" />
                <div className="h-4 w-16 rounded bg-border" />
                <div className="h-4 w-12 rounded bg-border" />
              </div>
              <div className="h-3 w-32 rounded bg-border mb-2" />
              <div className="h-3 w-64 rounded bg-border" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-error bg-error-container rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-error mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium text-on-error-container">
                No se pudo cargar el historial
              </p>
              <p className="mt-1 text-sm text-on-error-container">
                La información de tickets no está disponible temporalmente.
              </p>
              <button
                type="button"
                onClick={fetchTickets}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-on-error-container hover:brightness-110 transition-[filter]"
              >
                <RefreshCw size={14} aria-hidden />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {data && !data.tiene_tickets && !loading && (
        <div className="border border-border rounded-xl p-8 bg-background text-center">
          <MessageSquare size={32} className="mx-auto text-muted" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            Sin tickets
          </p>
          <p className="mt-1 text-sm text-muted">
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
                className="border border-border rounded-xl p-5 bg-background"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t.codigo_seguimiento}
                  </span>
                  <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
                  <StatusBadge tone={prioridad.tone}>{prioridad.label}</StatusBadge>
                </div>
                <p className="text-xs text-muted mb-1">
                  {t.categoria}
                </p>
                <p className="text-sm text-foreground">
                  {t.descripcion}
                </p>
                <p className="mt-2 text-xs text-muted">
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
