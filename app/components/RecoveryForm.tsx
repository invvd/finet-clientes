"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { recoverySchema } from "../utils/login-schema";
import { api } from "../utils/api";
import type { ApiError } from "../utils/api";
import LoginBranding from "./LoginBranding";
import RutInput from "./RutInput";

export default function RecoveryForm() {
  const [rut, setRut] = useState("");
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function validateField(value: string) {
    const result = recoverySchema.safeParse({ rut: value });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "rut");
      setError(issue?.message ?? "");
    } else {
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = recoverySchema.safeParse({ rut });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "rut");
      setError(issue?.message ?? "RUT inválido");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post<{ message: string }>("/auth/recuperar-password", result.data);
      setSent(true);
    } catch (err) {
      const apiError = err as ApiError;
      setServerError(apiError.message ?? "Error al enviar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-8 shadow-sm sm:p-10">
        <LoginBranding />
        <div className="mt-6 flex flex-col items-center text-center">
          <CheckCircle2 size={40} className="text-[var(--color-primary)]" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
            Revisa tu correo
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Si el RUT está registrado, recibirás un enlace de recuperación en tu
            correo electrónico.
          </p>
          <Link
            href="/inicio-sesion"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] transition-colors hover:opacity-80"
          >
            <ArrowLeft size={14} aria-hidden />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-8 shadow-sm sm:p-10">
      <LoginBranding />

      <div className="mt-6 text-center">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Recuperar contraseña
        </h2>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          Ingresa tu RUT y te enviaremos un enlace de recuperación
        </p>
      </div>

      {serverError && (
        <div className="mt-5 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <RutInput
          value={rut}
          error={error}
          onChange={(v) => {
            setRut(v);
            setError("");
          }}
          onBlur={() => validateField(rut)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-background)] shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/inicio-sesion"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft size={14} aria-hidden />
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
