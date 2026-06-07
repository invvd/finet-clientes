"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { securityLogger } from "./_lib/logger";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    securityLogger.pageError(window.location.pathname, {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 mb-6">
          <AlertCircle size={28} aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">
          Ocurrió un error inesperado. Por favor, intenta nuevamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-background)] shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
