"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema } from "../utils/login-schema";
import { api } from "../utils/api";
import type { ApiError } from "../utils/api";
import { useAuth } from "../_lib/auth";
import type { Cliente } from "../_lib/auth";
import LoginBranding from "./LoginBranding";
import RutInput from "./RutInput";
import PasswordInput from "./PasswordInput";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const expired = searchParams.get("expired") === "1";
  const { login, isAuthenticated, isLoading } = useAuth();
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/portal");
    }
  }, [isAuthenticated, isLoading, router]);

  function validateField(field: string, value: string) {
    const result = loginSchema.safeParse({ rut, password, [field]: value });
    if (!result.success) {
      const fieldError = result.error.issues.find(
        (i) => i.path[0] === field
      );
      setErrors((prev) => ({
        ...prev,
        [field]: fieldError?.message ?? "",
      }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");

    const result = loginSchema.safeParse({ rut, password });
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
      const data = await api.post<{ access_token: string; cliente: Cliente }>(
        "/auth/login",
        result.data
      );
      login(data.cliente);
      router.push(redirect ?? "/portal");
    } catch (err) {
      const error = err as ApiError;
      setServerError(error.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-8 shadow-sm sm:p-10">
      <LoginBranding />

      {expired && (
        <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Tu sesión fue cerrada por inactividad. Ingresa nuevamente.
        </div>
      )}

      {serverError && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <RutInput
          value={rut}
          error={errors.rut}
          onChange={(v) => {
            setRut(v);
            setErrors((prev) => ({ ...prev, rut: "" }));
          }}
          onBlur={() => validateField("rut", rut)}
        />
        <PasswordInput
          value={password}
          error={errors.password}
          onChange={(v) => {
            setPassword(v);
            setErrors((prev) => ({ ...prev, password: "" }));
          }}
          onBlur={() => validateField("password", password)}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[var(--color-muted)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
            Recordarme
          </label>
          <Link
            href="/recuperar-password"
            className="text-[var(--color-primary)] transition-colors hover:opacity-80"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-background)] shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        Al ingresar aceptas nuestros{" "}
        <a href="#" className="text-[var(--color-primary)] underline hover:opacity-80">
          Términos y Condiciones
        </a>
      </p>
    </div>
  );
}
