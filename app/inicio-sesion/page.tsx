"use client";

import { useState } from "react";
import AuthSwitch from "../components/AuthSwitch";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";

export default function InicioSesionPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-4">
      <div className="w-full max-w-md">
        <AuthSwitch active={mode} onChange={setMode} />
        {mode === "login" ? <LoginForm /> : <RegisterForm />}
      </div>
    </main>
  );
}
