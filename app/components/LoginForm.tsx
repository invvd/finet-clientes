"use client";

import { useState } from "react";
import { loginSchema } from "../utils/login-schema";
import LoginBranding from "./LoginBranding";
import RutInput from "./RutInput";
import PasswordInput from "./PasswordInput";

export default function LoginForm() {
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
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
    console.log(result.data);
  }

  return (
    <div className="rounded-2xl border border-fin-500/20 bg-surface/80 p-8 shadow-2xl shadow-fin-500/10 backdrop-blur-xl sm:p-10">
      <LoginBranding />

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
          onChange={(v) => {
            setPassword(v);
            setErrors((prev) => ({ ...prev, password: "" }));
          }}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-fin-500 outline-none ring-offset-slate-900 focus:ring-2 focus:ring-fin-400/30"
            />
            Recordarme
          </label>
          <a
            href="#"
            className="text-fin-400 transition-colors hover:text-fin-300"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-linear-to-r from-fin-500 to-fin-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fin-500/25 transition-all duration-200 hover:from-fin-400 hover:to-fin-500 hover:shadow-fin-400/30 active:scale-[0.98]"
        >
          Ingresar
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        Al ingresar aceptas nuestros{" "}
        <a href="#" className="text-slate-400 underline hover:text-slate-300">
          Términos y Condiciones
        </a>
      </p>
    </div>
  );
}
