"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../utils/api";
import type { ApiError } from "../utils/api";
import { cleanTelefono } from "../utils/login-schema";
import PasswordInput from "./PasswordInput";

export default function UpdateTelefonoForm({
  onUpdate,
}: {
  onUpdate?: (nuevoTelefono: string) => void;
}) {
  const [passwordActual, setPasswordActual] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validateTelefono(value: string) {
    const cleaned = cleanTelefono(value);
    if (cleaned.length < 8) return "El teléfono debe tener al menos 8 caracteres";
    if (cleaned.length > 12) return "El teléfono es demasiado largo";
    if (!/^\+?[\d\s\-()]+$/.test(value)) return "Formato de teléfono inválido";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const fieldErrors: Record<string, string> = {};

    if (!passwordActual.trim()) {
      fieldErrors.passwordActual = "La contraseña actual es requerida";
    }

    if (!telefono.trim()) {
      fieldErrors.telefono = "El teléfono es requerido";
    } else {
      const telefonoError = validateTelefono(telefono);
      if (telefonoError) fieldErrors.telefono = telefonoError;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const result = await api.patch<{
        id_cliente: number;
        telefono: string;
      }>("/auth/perfil/telefono", {
        password_actual: passwordActual,
        telefono: cleanTelefono(telefono),
      });

      setDone(true);
      setPasswordActual("");
      setTelefono("");
      onUpdate?.(result.telefono);
    } catch (err) {
      const apiError = err as ApiError;
      setServerError(apiError.message ?? "Error al actualizar el teléfono");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-background)] p-6">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">
        Actualizar Teléfono
      </h2>
      <p className="text-sm text-[var(--color-muted)] mb-6">
        Ingresa tu contraseña actual y el nuevo número de teléfono
      </p>

      {done && (
        <div className="mb-6 rounded-lg border border-green-500/20 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          Teléfono actualizado correctamente.
        </div>
      )}

      {serverError && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordInput
          id="password-actual-tel"
          label="Contraseña actual"
          value={passwordActual}
          error={errors.passwordActual}
          onChange={(v) => {
            setPasswordActual(v);
            setErrors((prev) => ({ ...prev, passwordActual: "" }));
            setDone(false);
          }}
        />

        <div>
          <label
            htmlFor="telefono"
            className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
          >
            Nuevo teléfono
          </label>
          <input
            id="telefono"
            type="tel"
            maxLength={12}
            value={telefono}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
              setTelefono(!cleaned || cleaned.startsWith("+") ? cleaned : "+" + cleaned);
              setErrors((prev) => ({ ...prev, telefono: "" }));
              setDone(false);
            }}
            placeholder="+56912345678"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 ${
              errors.telefono ? "border-red-500" : "border-[var(--color-border)]"
            }`}
          />
          {errors.telefono && (
            <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-background)] shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Actualizando..." : "Actualizar teléfono"}
        </button>
      </form>
    </div>
  );
}
