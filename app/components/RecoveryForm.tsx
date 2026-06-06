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
      <div className="rounded-2xl border border-fin-500/20 bg-surface/80 p-8 shadow-2xl shadow-fin-500/10 backdrop-blur-xl sm:p-10">
        <LoginBranding />
        <div className="mt-6 flex flex-col items-center text-center">
          <CheckCircle2 size={40} className="text-fin-400" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-white">
            Revisa tu correo
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Si el RUT está registrado, recibirás un enlace de recuperación en tu
            correo electrónico.
          </p>
          <Link
            href="/inicio-sesion"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-fin-400 transition-colors hover:text-fin-300"
          >
            <ArrowLeft size={14} aria-hidden />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-fin-500/20 bg-surface/80 p-8 shadow-2xl shadow-fin-500/10 backdrop-blur-xl sm:p-10">
      <LoginBranding />

      <div className="mt-6 text-center">
        <h2 className="text-lg font-semibold text-white">
          Recuperar contraseña
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Ingresa tu RUT y te enviaremos un enlace de recuperación
        </p>
      </div>

      {serverError && (
        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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
          className="w-full rounded-lg bg-linear-to-r from-fin-500 to-fin-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fin-500/25 transition-all duration-200 hover:from-fin-400 hover:to-fin-500 hover:shadow-fin-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/inicio-sesion"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-300"
        >
          <ArrowLeft size={14} aria-hidden />
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
