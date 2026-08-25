"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import AdminAccessForm from "./AdminAccessForm";
import StatusBadge from "@/app/_components/ui/StatusBadge";
import {
  AdminApiError,
  desbloquearIp,
  getHistorialIps,
} from "@/app/_lib/admin-api";
import type { HistorialIps } from "@/app/_lib/admin-api";
import { useAdminAccess } from "@/app/_lib/use-admin-access";

function fecha(valor: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(
    new Date(valor),
  );
}

function hora(valor: string) {
  return new Intl.DateTimeFormat("es-CL", { timeStyle: "short" }).format(
    new Date(valor),
  );
}

export default function SecurityEventsPanel() {
  const { apiKey, ready, entrar, salir } = useAdminAccess();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ip, setIp] = useState("");
  const [soloBloqueadas, setSoloBloqueadas] = useState(true);
  const [historial, setHistorial] = useState<HistorialIps | null>(null);
  const [loading, setLoading] = useState(false);
  const [procesandoIp, setProcesandoIp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const manejarError = useCallback(
    (caught: unknown, fallback: string) => {
      if (caught instanceof AdminApiError && caught.status === 401) {
        salir();
        return;
      }
      setError(caught instanceof Error ? caught.message : fallback);
    },
    [salir],
  );

  const cargar = useCallback(
    async (page = 1) => {
      if (!apiKey) return;
      setLoading(true);
      setError("");
      setAviso("");
      try {
        setHistorial(
          await getHistorialIps(apiKey, {
            desde: desde || undefined,
            hasta: hasta || undefined,
            ip: ip.trim() || undefined,
            soloBloqueadas,
            page,
          }),
        );
      } catch (caught) {
        manejarError(
          caught,
          "No fue posible cargar el historial de seguridad.",
        );
      } finally {
        setLoading(false);
      }
    },
    [apiKey, desde, hasta, ip, manejarError, soloBloqueadas],
  );

  useEffect(() => {
    if (!apiKey) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        setHistorial(
          await getHistorialIps(apiKey, {
            soloBloqueadas: true,
            page: 1,
          }),
        );
      } catch (caught) {
        manejarError(
          caught,
          "No fue posible cargar el historial de seguridad.",
        );
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [apiKey, manejarError]);

  async function desbloquear(direccion: string) {
    if (!apiKey) return;
    setProcesandoIp(direccion);
    setError("");
    setAviso("");
    try {
      const resultado = await desbloquearIp(apiKey, direccion);
      await cargar(historial?.page ?? 1);
      setAviso(
        resultado.desbloqueado
          ? `La IP ${direccion} fue desbloqueada.`
          : `La IP ${direccion} ya no tenía un bloqueo activo.`,
      );
    } catch (caught) {
      manejarError(caught, "No fue posible desbloquear la IP.");
    } finally {
      setProcesandoIp(null);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-48 items-center justify-center text-muted">
        <Loader2 className="animate-spin" size={22} aria-label="Cargando" />
      </div>
    );
  }

  if (!apiKey) {
    return <AdminAccessForm title="Acceso administrativo" onSubmit={entrar} />;
  }

  const totalPaginas = historial
    ? Math.max(1, Math.ceil(historial.total / historial.limit))
    : 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck size={21} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Eventos de seguridad
            </h1>
            <p className="text-sm text-muted">Historial de IPs bloqueadas</p>
          </div>
        </div>
        <button
          type="button"
          onClick={salir}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-surface"
        >
          <LogOut size={17} aria-hidden />
          Cerrar acceso
        </button>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void cargar();
        }}
        className="grid gap-4 rounded-xl border border-border bg-background p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end"
      >
        <label className="text-sm font-medium text-foreground">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          Dirección IP
          <input
            type="text"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="192.168.1.10"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={17} aria-hidden />
          Consultar
        </button>
        <label className="flex min-h-8 items-center gap-2 text-sm text-foreground sm:col-span-2 lg:col-span-4">
          <input
            type="checkbox"
            checked={soloBloqueadas}
            onChange={(event) => setSoloBloqueadas(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Mostrar solo bloqueos activos
        </label>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error bg-error-container p-4 text-sm text-on-error-container"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {aviso && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success bg-success-container p-4 text-sm text-on-success-container"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" aria-hidden />
          {aviso}
        </div>
      )}

      {loading ? (
        <div className="space-y-2" aria-label="Cargando historial">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : historial && historial.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-8 text-center">
          <LockKeyhole size={30} className="mx-auto text-muted" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            Sin registros de bloqueo
          </p>
          <p className="mt-1 text-sm text-muted">
            No hay eventos para el período consultado.
          </p>
        </div>
      ) : historial ? (
        <section aria-label="Historial de IPs bloqueadas">
          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Dirección IP</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 text-right font-medium">Intentos</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historial.data.map((registro) => (
                  <tr key={registro.ip}>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {registro.ip}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {fecha(registro.ultimo_intento)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {hora(registro.ultimo_intento)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {registro.total_intentos}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={registro.bloqueado ? "error" : "success"}
                      >
                        {registro.bloqueado ? "Bloqueada" : "Sin bloqueo"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => desbloquear(registro.ip)}
                        disabled={
                          !registro.bloqueado || procesandoIp === registro.ip
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Unlock size={15} aria-hidden />
                        {procesandoIp === registro.ip
                          ? "Procesando..."
                          : "Desbloquear"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Página {historial.page} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cargar(historial.page - 1)}
                disabled={historial.page <= 1}
                aria-label="Página anterior"
                title="Página anterior"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-40"
              >
                <ChevronLeft size={17} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => cargar(historial.page + 1)}
                disabled={historial.page >= totalPaginas}
                aria-label="Página siguiente"
                title="Página siguiente"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-40"
              >
                <ChevronRight size={17} aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
