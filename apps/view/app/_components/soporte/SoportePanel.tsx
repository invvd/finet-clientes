"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  LogOut,
  RefreshCw,
  Send,
  Wrench,
} from "lucide-react";
import PrimaryButton from "@/app/_components/ui/PrimaryButton";
import StatusBadge, { type StatusTone } from "@/app/_components/ui/StatusBadge";
import {
  actualizarTicket,
  getTicketDetalle,
  getTicketsAsignados,
  SOPORTE_API_KEY_STORAGE,
  SOPORTE_TECNICO_STORAGE,
  SoporteApiError,
} from "@/app/_lib/soporte-admin";
import type {
  TicketAsignado,
  TicketDetalle,
  TicketsAsignados,
} from "@/app/_lib/soporte-admin";

function estadoBadge(estado: string): { label: string; tone: StatusTone } {
  const estados: Record<string, { label: string; tone: StatusTone }> = {
    abierto: { label: "Abierto", tone: "info" },
    en_progreso: { label: "En progreso", tone: "warning" },
    cerrado: { label: "Cerrado", tone: "success" },
  };
  return estados[estado] ?? { label: estado, tone: "neutral" };
}

function formatFecha(fecha: string) {
  if (!fecha) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fecha));
}

export default function SoportePanel() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [idUsuario, setIdUsuario] = useState<number | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [tickets, setTickets] = useState<TicketsAsignados | null>(null);
  const [ticketSeleccionado, setTicketSeleccionado] =
    useState<TicketDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const keyGuardada = sessionStorage.getItem(SOPORTE_API_KEY_STORAGE);
      const tecnicoGuardado = Number(
        sessionStorage.getItem(SOPORTE_TECNICO_STORAGE),
      );
      if (
        keyGuardada &&
        Number.isInteger(tecnicoGuardado) &&
        tecnicoGuardado > 0
      ) {
        setApiKey(keyGuardada);
        setIdUsuario(tecnicoGuardado);
      }
      setSesionLista(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const cerrarAcceso = useCallback(() => {
    sessionStorage.removeItem(SOPORTE_API_KEY_STORAGE);
    sessionStorage.removeItem(SOPORTE_TECNICO_STORAGE);
    setApiKey(null);
    setIdUsuario(null);
    setTickets(null);
    setTicketSeleccionado(null);
    setError("");
  }, []);

  const manejarError = useCallback(
    (caught: unknown, fallback: string) => {
      if (caught instanceof SoporteApiError && caught.status === 401) {
        cerrarAcceso();
        return;
      }
      setError(caught instanceof Error ? caught.message : fallback);
    },
    [cerrarAcceso],
  );

  const cargarTickets = useCallback(async () => {
    if (!apiKey || !idUsuario) return;
    setLoading(true);
    setError("");
    try {
      const resultado = await getTicketsAsignados(apiKey, idUsuario);
      setTickets(resultado);
      if (!resultado.tiene_tickets) setTicketSeleccionado(null);
    } catch (caught) {
      manejarError(caught, "No fue posible cargar los tickets asignados.");
    } finally {
      setLoading(false);
    }
  }, [apiKey, idUsuario, manejarError]);

  useEffect(() => {
    if (!apiKey || !idUsuario) return;
    const timeout = setTimeout(() => void cargarTickets(), 0);
    return () => clearTimeout(timeout);
  }, [apiKey, cargarTickets, idUsuario]);

  async function seleccionarTicket(ticket: TicketAsignado) {
    if (!apiKey || !idUsuario) return;
    setLoadingDetalle(true);
    setError("");
    try {
      setTicketSeleccionado(
        await getTicketDetalle(apiKey, idUsuario, ticket.id_ticket),
      );
    } catch (caught) {
      manejarError(caught, "No fue posible cargar el detalle del ticket.");
    } finally {
      setLoadingDetalle(false);
    }
  }

  if (!sesionLista) {
    return (
      <div className="flex min-h-48 items-center justify-center text-muted">
        <Loader2 className="animate-spin" size={22} aria-label="Cargando" />
      </div>
    );
  }

  if (!apiKey || !idUsuario) {
    return (
      <AccesoSoporte
        onSubmit={(key, tecnico) => {
          sessionStorage.setItem(SOPORTE_API_KEY_STORAGE, key);
          sessionStorage.setItem(SOPORTE_TECNICO_STORAGE, String(tecnico));
          setApiKey(key);
          setIdUsuario(tecnico);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wrench size={20} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Panel de soporte
            </h1>
            <p className="text-sm text-muted">Técnico #{idUsuario}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={cerrarAcceso}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-surface"
        >
          <LogOut size={17} aria-hidden />
          Cambiar acceso
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error bg-error-container p-4 text-sm text-on-error-container"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={cargarTickets}
              className="mt-2 inline-flex items-center gap-1.5 font-medium"
            >
              <RefreshCw size={15} aria-hidden />
              Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="tickets-asignados-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="tickets-asignados-title"
              className="text-base font-semibold text-foreground"
            >
              Tickets asignados
            </h2>
            <button
              type="button"
              onClick={cargarTickets}
              aria-label="Actualizar tickets"
              title="Actualizar tickets"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
            >
              <RefreshCw size={17} aria-hidden />
            </button>
          </div>

          {loading && (
            <div className="space-y-2" aria-label="Cargando tickets">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl border border-border bg-surface"
                />
              ))}
            </div>
          )}

          {!loading && tickets && !tickets.tiene_tickets && (
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <ClipboardList
                size={30}
                className="mx-auto text-muted"
                aria-hidden
              />
              <p className="mt-3 text-sm font-medium text-foreground">
                Sin tickets asignados
              </p>
              <p className="mt-1 text-sm text-muted">
                No hay casos pendientes para este técnico.
              </p>
            </div>
          )}

          {!loading && tickets?.tiene_tickets && (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
              {tickets.tickets.map((ticket) => {
                const estado = estadoBadge(ticket.estado);
                const activo =
                  ticketSeleccionado?.id_ticket === ticket.id_ticket;
                return (
                  <button
                    key={ticket.id_ticket}
                    type="button"
                    onClick={() => seleccionarTicket(ticket)}
                    className={`w-full p-4 text-left transition-colors hover:bg-surface ${
                      activo ? "bg-surface" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {ticket.codigo_seguimiento ??
                          `Ticket #${ticket.id_ticket}`}
                      </span>
                      <StatusBadge tone={estado.tone}>
                        {estado.label}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {ticket.categoria}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {ticket.cliente ?? "Cliente no disponible"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="ticket-detalle-title">
          <h2
            id="ticket-detalle-title"
            className="mb-3 text-base font-semibold text-foreground"
          >
            Detalle del ticket
          </h2>
          {loadingDetalle ? (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-border bg-background text-muted">
              <Loader2
                className="animate-spin"
                size={22}
                aria-label="Cargando"
              />
            </div>
          ) : ticketSeleccionado ? (
            <DetalleTicket
              key={`${ticketSeleccionado.id_ticket}-${ticketSeleccionado.estado}-${ticketSeleccionado.historial.length}`}
              ticket={ticketSeleccionado}
              apiKey={apiKey}
              idUsuario={idUsuario}
              onUpdated={(ticket) => {
                setTicketSeleccionado(ticket);
                void cargarTickets();
              }}
            />
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted">
              Selecciona un ticket para revisar su descripción e historial.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AccesoSoporte({
  onSubmit,
}: {
  onSubmit: (apiKey: string, idUsuario: number) => void;
}) {
  const [key, setKey] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="mx-auto max-w-md rounded-xl border border-border bg-background p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const id = Number(tecnico);
        if (!key.trim() || !Number.isInteger(id) || id <= 0) {
          setError(
            "Ingresa la clave interna y un identificador de técnico válido.",
          );
          return;
        }
        onSubmit(key.trim(), id);
      }}
    >
      <h1 className="text-xl font-semibold text-foreground">
        Acceso a soporte
      </h1>
      <p className="mt-3 text-sm text-muted">
        Usa las credenciales internas configuradas para el panel.
      </p>
      <label className="mt-5 block text-sm font-medium text-foreground">
        Clave interna
        <input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          autoComplete="off"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-foreground">
        ID del técnico
        <input
          type="number"
          min="1"
          step="1"
          value={tecnico}
          onChange={(event) => setTecnico(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" className="mt-5 w-full">
        Entrar
      </PrimaryButton>
    </form>
  );
}

function DetalleTicket({
  ticket,
  apiKey,
  idUsuario,
  onUpdated,
}: {
  ticket: TicketDetalle;
  apiKey: string;
  idUsuario: number;
  onUpdated: (ticket: TicketDetalle) => void;
}) {
  const [estado, setEstado] = useState(ticket.estado);
  const [accion, setAccion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const estadoActual = estadoBadge(ticket.estado);

  async function guardar() {
    if (!accion.trim()) {
      setError(
        estado === "cerrado"
          ? "Ingresa el detalle de la resolución antes de cerrar."
          : "Registra la acción realizada.",
      );
      return;
    }

    setGuardando(true);
    setError("");
    setExito(false);
    try {
      const actualizado = await actualizarTicket(apiKey, ticket.id_ticket, {
        id_usuario: idUsuario,
        estado,
        accion: accion.trim(),
      });
      onUpdated(actualizado);
      setExito(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar el ticket.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-background p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-foreground">
            {ticket.codigo_seguimiento ?? `Ticket #${ticket.id_ticket}`}
          </span>
          <StatusBadge tone={estadoActual.tone}>
            {estadoActual.label}
          </StatusBadge>
        </div>
        <p className="mt-2 text-sm text-muted">
          {ticket.cliente ?? "Cliente no disponible"} · {ticket.categoria}
        </p>
        <p className="mt-3 text-sm leading-6 text-foreground">
          {ticket.descripcion ?? "Sin descripción registrada."}
        </p>
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">
          Historial de acciones
        </h3>
        {ticket.historial.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Aún no hay acciones registradas.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {ticket.historial.map((item) => (
              <li key={item.id_log} className="border-l-2 border-primary pl-3">
                <p className="text-sm text-foreground">{item.detalle}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatFecha(item.fecha_hora)}
                  {item.tecnico ? ` · ${item.tecnico}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {ticket.estado !== "cerrado" && (
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-foreground">
            Registrar atención
          </h3>
          <label className="mt-3 block text-sm font-medium text-foreground">
            Estado
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="abierto">Abierto</option>
              <option value="en_progreso">En progreso</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium text-foreground">
            {estado === "cerrado"
              ? "Detalle de la resolución"
              : "Acción realizada"}
            <textarea
              value={accion}
              onChange={(event) => setAccion(event.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm text-error">
              {error}
            </p>
          )}
          {exito && (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 text-sm text-success"
            >
              <CheckCircle2 size={17} aria-hidden />
              Acción registrada correctamente.
            </p>
          )}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} aria-hidden />
            {guardando
              ? "Guardando..."
              : estado === "cerrado"
                ? "Confirmar resolución y cerrar"
                : "Guardar actualización"}
          </button>
        </div>
      )}
    </div>
  );
}
