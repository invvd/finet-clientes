"use client";

import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import AdminAccessForm from "./AdminAccessForm";
import {
  AdminApiError,
  descargarReporteFinanciero,
  generarReporteFinanciero,
} from "@/app/_lib/admin-api";
import type { ReporteFinanciero } from "@/app/_lib/admin-api";
import { useAdminAccess } from "@/app/_lib/use-admin-access";

const moneda = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fecha(valor: string | null) {
  if (!valor) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(valor));
}

export default function FinancialReportsPanel() {
  const { apiKey, ready, entrar, salir } = useAdminAccess();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [reporte, setReporte] = useState<ReporteFinanciero | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  function manejarError(caught: unknown, fallback: string) {
    if (caught instanceof AdminApiError && caught.status === 401) {
      salir();
      return;
    }
    setError(caught instanceof Error ? caught.message : fallback);
  }

  async function generar() {
    if (!apiKey) return;
    if (!desde || !hasta) {
      setError("Selecciona la fecha inicial y la fecha final.");
      return;
    }
    if (desde > hasta) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }

    setLoading(true);
    setError("");
    setReporte(null);
    try {
      setReporte(await generarReporteFinanciero(apiKey, { desde, hasta }));
    } catch (caught) {
      manejarError(caught, "No fue posible generar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  async function descargar() {
    if (!apiKey || !reporte) return;
    setDescargando(true);
    setError("");
    try {
      const archivo = await descargarReporteFinanciero(apiKey, reporte.periodo);
      const url = URL.createObjectURL(archivo.blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.nombre;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      manejarError(
        caught,
        "La descarga falló. Revisa la conexión e intenta nuevamente.",
      );
    } finally {
      setDescargando(false);
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 size={21} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Reportes financieros
            </h1>
            <p className="text-sm text-muted">
              Ingresos y deudas globales por período
            </p>
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
          void generar();
        }}
        className="grid gap-4 rounded-xl border border-border bg-background p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="text-sm font-medium text-foreground">
          Fecha inicial
          <input
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          Fecha final
          <input
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <FileSpreadsheet size={17} aria-hidden />
          )}
          {loading ? "Generando..." : "Generar reporte"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error bg-error-container p-4 text-sm text-on-error-container"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1">
            <p>{error}</p>
            {reporte && (
              <button
                type="button"
                onClick={descargar}
                className="mt-2 inline-flex min-h-8 items-center gap-1.5 font-medium"
              >
                <RefreshCw size={15} aria-hidden />
                Reintentar descarga
              </button>
            )}
          </div>
        </div>
      )}

      {reporte && (
        <section className="space-y-6" aria-label="Reporte financiero generado">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Período {fecha(`${reporte.periodo.desde}T00:00:00.000Z`)} al{" "}
              {fecha(`${reporte.periodo.hasta}T00:00:00.000Z`)}
            </p>
            <button
              type="button"
              onClick={descargar}
              disabled={descargando}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary px-4 text-sm font-medium text-primary hover:bg-primary hover:text-background disabled:opacity-50"
            >
              <Download size={17} aria-hidden />
              {descargando ? "Preparando..." : "Descargar CSV"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Resumen
              label="Ingresos"
              valor={moneda.format(reporte.resumen.total_ingresos)}
            />
            <Resumen
              label="Deuda pendiente"
              valor={moneda.format(reporte.resumen.total_deudas)}
            />
            <Resumen
              label="Pagos registrados"
              valor={String(reporte.resumen.cantidad_pagos)}
            />
            <Resumen
              label="Facturas pendientes"
              valor={String(reporte.resumen.cantidad_facturas_pendientes)}
            />
          </div>

          <DetalleIngresos reporte={reporte} />
          <DetalleDeudas reporte={reporte} />
        </section>
      )}
    </div>
  );
}

function Resumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
        {valor}
      </p>
    </div>
  );
}

function DetalleIngresos({ reporte }: { reporte: ReporteFinanciero }) {
  return (
    <section aria-labelledby="detalle-ingresos">
      <h2 id="detalle-ingresos" className="mb-3 text-base font-semibold">
        Ingresos del período
      </h2>
      {reporte.ingresos.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-5 text-sm text-muted">
          No hay pagos registrados en el período.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Pasarela</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reporte.ingresos.map((pago) => (
                <tr key={pago.id_pago}>
                  <td className="px-4 py-3">{fecha(pago.fecha_pago)}</td>
                  <td className="px-4 py-3">
                    {pago.cliente ?? "Cliente no disponible"}
                  </td>
                  <td className="px-4 py-3">{pago.pasarela}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {moneda.format(pago.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DetalleDeudas({ reporte }: { reporte: ReporteFinanciero }) {
  return (
    <section aria-labelledby="detalle-deudas">
      <h2 id="detalle-deudas" className="mb-3 text-base font-semibold">
        Deudas de la cartera
      </h2>
      {reporte.deudas.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-5 text-sm text-muted">
          No hay facturas pendientes en el período.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Factura</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Vencimiento</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reporte.deudas.map((factura) => (
                <tr key={factura.id_factura}>
                  <td className="px-4 py-3">#{factura.id_factura}</td>
                  <td className="px-4 py-3">
                    {factura.cliente ?? "Cliente no disponible"}
                  </td>
                  <td className="px-4 py-3">{factura.periodo}</td>
                  <td className="px-4 py-3">
                    {fecha(factura.fecha_limite_pago)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {moneda.format(factura.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
