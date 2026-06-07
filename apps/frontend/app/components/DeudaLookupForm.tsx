"use client";

import { useState } from "react";
import { Search, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { cleanRut } from "../utils/login-schema";
import { recoverySchema } from "../utils/login-schema";
import RutInput from "../components/RutInput";

type Factura = {
  id_factura: number;
  periodo: string;
  monto: number;
  fecha_limite_pago: string;
  estado: string;
  dias_vencida: number | null;
  dias_para_vencer: number | null;
};

type DeudaData = {
  encontrado: boolean;
  cliente: {
    nombre_completo: string;
    rut: string;
    codigo_abonado: number;
  } | null;
  tiene_deuda: boolean;
  saldo_total: number;
  facturas: Factura[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function formatPrecio(precio: number) {
  return `$${precio.toLocaleString("es-CL")}`;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export default function DeudaLookupForm() {
  const [modo, setModo] = useState<"rut" | "abonado">("rut");
  const [rut, setRut] = useState("");
  const [rutError, setRutError] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoError, setCodigoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DeudaData | null>(null);

  function validateRut(value: string) {
    const r = recoverySchema.safeParse({ rut: value });
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "rut");
      setRutError(issue?.message ?? "");
    } else {
      setRutError("");
    }
  }

  function validateCodigo(value: string) {
    if (!value || value.trim() === "") {
      setCodigoError("El código de abonado es obligatorio");
    } else {
      setCodigoError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (modo === "rut") {
      const r = recoverySchema.safeParse({ rut });
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.path[0] === "rut");
        setRutError(issue?.message ?? "RUT inválido");
        return;
      }
      setRutError("");
    } else {
      if (!codigo || codigo.trim() === "") {
        setCodigoError("El código de abonado es obligatorio");
        return;
      }
      setCodigoError("");
    }

    setLoading(true);

    const endpoint =
      modo === "rut"
        ? `${API_URL}/deuda-publica/rut?rut=${encodeURIComponent(cleanRut(rut))}`
        : `${API_URL}/deuda-publica/abonado?codigo_abonado=${encodeURIComponent(codigo.trim())}`;

    try {
      const res = await fetch(endpoint, { credentials: "include" });

      if (!res.ok) throw res;

      const data: DeudaData = await res.json();
      setResult(data);
    } catch {
      setError("No se pudo consultar la deuda. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setResult(null);
    setError("");
    if (modo === "rut") {
      setRut("");
      setRutError("");
    } else {
      setCodigo("");
      setCodigoError("");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Search size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Consultar Deuda
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Verifica deudas pendientes sin necesidad de iniciar sesión
          </p>
        </div>
      </div>

      {/* Toggle RUT / Abonado */}
      <div className="flex w-full rounded-full bg-[var(--color-border)] p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setModo("rut");
            resetAll();
          }}
          className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
            modo === "rut"
              ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          Por RUT
        </button>
        <button
          type="button"
          onClick={() => {
            setModo("abonado");
            resetAll();
          }}
          className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
            modo === "abonado"
              ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          Por Código Abonado
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border border-[var(--color-border)] rounded-xl p-6 bg-[var(--color-background)] mb-6"
        noValidate
      >
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            {modo === "rut" ? (
              <RutInput
                value={rut}
                error={rutError}
                onChange={(v) => {
                  setRut(v);
                  setRutError("");
                  setResult(null);
                }}
                onBlur={() => validateRut(rut)}
              />
            ) : (
              <div>
                <label
                  htmlFor="codigoAbonado"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
                >
                  Código de Abonado
                </label>
                <input
                  id="codigoAbonado"
                  type="text"
                  inputMode="numeric"
                  placeholder="100"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.replace(/\D/g, ""));
                    setCodigoError("");
                    setResult(null);
                  }}
                  onBlur={() => validateCodigo(codigo)}
                  data-error={!!codigoError}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200
                    data-[error=false]:border-[var(--color-border)] data-[error=false]:bg-[var(--color-background)] data-[error=false]:text-[var(--color-foreground)] data-[error=false]:placeholder:text-[var(--color-muted)] data-[error=false]:focus-visible:outline data-[error=false]:focus-visible:outline-2 data-[error=false]:focus-visible:outline-offset-0 data-[error=false]:focus-visible:outline-[var(--color-primary)]
                    border-red-500 bg-red-50 text-[var(--color-foreground)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-red-500`}
                />
                {codigoError && (
                  <p className="mt-1 text-xs text-red-600">{codigoError}</p>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-7 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-background)] shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </div>
      </form>

      {error && (
        <div className="border border-red-500/20 bg-red-50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && result.encontrado && (
        <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-background)] divide-y divide-[var(--color-border)]">
          <div className="p-6">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {result.cliente!.nombre_completo}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  RUT {result.cliente!.rut} — Abonado {result.cliente!.codigo_abonado}
                </p>
              </div>
            </div>

            {result.tiene_deuda ? (
              <>
                <p className="mt-4 text-3xl font-extrabold text-red-600">
                  {formatPrecio(result.saldo_total)}
                </p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Saldo pendiente
                </p>
              </>
            ) : (
              <p className="mt-4 text-lg font-semibold text-green-600">
                Sin deudas pendientes
              </p>
            )}
          </div>

          {result.tiene_deuda && result.facturas.length > 0 && (
            <div className="p-6">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                Detalle de facturas
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <th className="pb-2 font-medium">Periodo</th>
                      <th className="pb-2 font-medium">Monto</th>
                      <th className="pb-2 font-medium">Vence</th>
                      <th className="pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {result.facturas.map((f) => (
                      <tr key={f.id_factura}>
                        <td className="py-2 text-[var(--color-foreground)]">{f.periodo}</td>
                        <td className="py-2 text-[var(--color-foreground)]">
                          {formatPrecio(f.monto)}
                        </td>
                        <td className="py-2 text-[var(--color-muted)]">
                          {formatFecha(f.fecha_limite_pago)}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                              f.estado === "vencida"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {f.estado === "vencida" ? "Vencida" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {result && !result.encontrado && (
        <div className="border border-[var(--color-border)] rounded-xl p-8 bg-[var(--color-background)] text-center">
          <FileText size={32} className="mx-auto text-[var(--color-muted)]" aria-hidden />
          <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
            No se encontraron coincidencias
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {modo === "rut"
              ? "No existe un cliente asociado al RUT ingresado."
              : "No existe un cliente asociado al código de abonado ingresado."}
          </p>
        </div>
      )}
    </div>
  );
}
