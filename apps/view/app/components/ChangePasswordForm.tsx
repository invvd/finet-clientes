"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { changePasswordSchema } from "../utils/login-schema";
import { api } from "../utils/api";
import type { ApiError } from "../utils/api";
import PasswordInput from "./PasswordInput";

export default function ChangePasswordForm() {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validateField(field: string, value: string) {
    const data: Record<string, string> = {
      passwordActual,
      passwordNuevo,
      passwordConfirmacion,
      [field]: value,
    };
    const result = changePasswordSchema.safeParse(data);
    if (!result.success) {
      const fieldError = result.error.issues.find((i) => i.path[0] === field);
      setErrors((prev) => ({ ...prev, [field]: fieldError?.message ?? "" }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = changePasswordSchema.safeParse({
      passwordActual,
      passwordNuevo,
      passwordConfirmacion,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await api.patch<{ mensaje: string }>("/auth/perfil/password", {
        password_actual: result.data.passwordActual,
        password_nuevo: result.data.passwordNuevo,
        password_confirmacion: result.data.passwordConfirmacion,
      });
      setDone(true);
      setPasswordActual("");
      setPasswordNuevo("");
      setPasswordConfirmacion("");
    } catch (err) {
      const apiError = err as ApiError;
      setServerError(apiError.message ?? "Error al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-xl bg-background p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Cambiar Contraseña
      </h2>
      <p className="text-sm text-muted mb-6">
        Mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 carácter especial
      </p>

      {done && (
        <div className="mb-6 rounded-lg border border-success/20 bg-success-container px-4 py-3 text-sm text-on-success-container flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          Contraseña actualizada correctamente.
        </div>
      )}

      {serverError && (
        <div className="mb-6 rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordInput
          id="password-actual"
          label="Contraseña actual"
          value={passwordActual}
          error={errors.passwordActual}
          onChange={(v) => {
            setPasswordActual(v);
            setErrors((prev) => ({ ...prev, passwordActual: "" }));
            setDone(false);
          }}
          onBlur={() => validateField("passwordActual", passwordActual)}
        />
        <PasswordInput
          id="password-nuevo"
          label="Nueva contraseña"
          value={passwordNuevo}
          error={errors.passwordNuevo}
          onChange={(v) => {
            setPasswordNuevo(v);
            setErrors((prev) => ({ ...prev, passwordNuevo: "" }));
            setDone(false);
          }}
          onBlur={() => validateField("passwordNuevo", passwordNuevo)}
        />
        <PasswordInput
          id="password-confirmacion"
          label="Confirmar nueva contraseña"
          value={passwordConfirmacion}
          error={errors.passwordConfirmacion}
          onChange={(v) => {
            setPasswordConfirmacion(v);
            setErrors((prev) => ({ ...prev, passwordConfirmacion: "" }));
            setDone(false);
          }}
          onBlur={() => validateField("passwordConfirmacion", passwordConfirmacion)}
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
