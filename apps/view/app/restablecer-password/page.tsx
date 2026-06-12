"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../_lib/auth";
import ResetPasswordForm from "../components/ResetPasswordForm";
import LoginBranding from "../components/LoginBranding";

function getTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#token=(.+)$/);
  return match ? match[1] : null;
}

const noopSubscribe = () => () => {};

export default function RestablecerPasswordPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [token] = useState(getTokenFromHash);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/portal");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated || !hydrated) return null;

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm sm:p-10">
            <LoginBranding />
            <div className="mt-6 flex flex-col items-center text-center">
              <AlertCircle size={40} className="text-error" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Enlace inválido o expirado
              </h2>
              <p className="mt-2 text-sm text-muted">
                El enlace de recuperación no es válido o ha expirado. Solicita
                uno nuevo.
              </p>
              <Link
                href="/recuperar-password"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90"
              >
                Solicitar nuevo enlace
              </Link>
              <Link
                href="/inicio-sesion"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                <ArrowLeft size={14} aria-hidden />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
