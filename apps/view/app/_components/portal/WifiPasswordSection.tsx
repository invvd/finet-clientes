'use client';

import { useState, useTransition } from 'react';
import { Wifi, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { changeWifiPassword } from '@/app/portal/_lib/portal-actions';

// RF-24: Solo alfanuméricos
const WIFI_REGEX = /^[a-zA-Z0-9]+$/;
const MIN_LEN = 8;
const MAX_LEN = 63;

function validate(value: string): string {
  if (!value) return 'Ingresa la nueva contraseña';
  if (value.length < MIN_LEN) return `Mínimo ${MIN_LEN} caracteres`;
  if (value.length > MAX_LEN) return `Máximo ${MAX_LEN} caracteres`;
  if (!WIFI_REGEX.test(value)) return 'Solo se permiten letras y números (sin símbolos ni espacios)';
  return '';
}

export default function WifiPasswordSection() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(password);
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError('');
    setResult(null);
    startTransition(async () => {
      const res = await changeWifiPassword(password);
      setResult(res);
      if (res.success) setPassword('');
    });
  };

  if (result?.success) {
    return (
      <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-3">
        <p className="text-sm font-medium text-muted">Cambiar Contraseña WiFi</p>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-success shrink-0" size={24} />
          <p className="text-sm font-semibold text-success">
            Solicitud enviada correctamente. El cambio puede tardar unos minutos.
          </p>
        </div>
        <button
          onClick={() => setResult(null)}
          className="self-start text-xs text-primary underline underline-offset-2"
        >
          Realizar otro cambio
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Wifi className="text-primary shrink-0" size={18} />
        <p className="text-sm font-medium text-muted">Cambiar Contraseña WiFi</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wifi-password" className="text-xs font-medium text-muted">
            Nueva contraseña <span className="text-foreground">(solo letras y números)</span>
          </label>
          <div className="relative">
            <input
              id="wifi-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldError) setFieldError(validate(e.target.value));
              }}
              placeholder="Ej: MiRed2024"
              autoComplete="new-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldError && (
            <p className="text-xs text-error">{fieldError}</p>
          )}
          {result?.error && !fieldError && (
            <p className="text-xs text-error">{result.error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Enviando solicitud...' : 'Solicitar cambio'}
        </button>
      </form>
    </div>
  );
}
