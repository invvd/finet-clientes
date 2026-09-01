'use client';

import { useState, useEffect, useTransition } from 'react';
import { Wifi, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import {
  changeWifiPassword,
  getContratosParaWifi,
  type ContratoParaWifi,
} from '@/app/portal/_lib/portal-actions';

const MIN_LEN = 8;
const MAX_LEN = 63;

interface Requisito {
  label: string;
  cumplido: (value: string) => boolean;
}

const REQUISITOS: Requisito[] = [
  {
    label: `Entre ${MIN_LEN} y ${MAX_LEN} caracteres`,
    cumplido: (v) => v.length >= MIN_LEN && v.length <= MAX_LEN,
  },
  {
    label: 'Sin espacios en blanco',
    cumplido: (v) => v.length > 0 && !/\s/.test(v),
  },
];

function validate(value: string): string {
  if (!value) return 'Ingresa la nueva contraseña';
  if (value.length < MIN_LEN) return `Mínimo ${MIN_LEN} caracteres`;
  if (value.length > MAX_LEN) return `Máximo ${MAX_LEN} caracteres`;
  if (/\s/.test(value)) return 'No se permiten espacios';
  return '';
}

export default function WifiPasswordSection() {
  const [contratos, setContratos] = useState<ContratoParaWifi[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(true);
  const [idContrato, setIdContrato] = useState<number | ''>('');

  const [password, setPassword] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false);

  const [fieldError, setFieldError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [contratoError, setContratoError] = useState('');
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getContratosParaWifi()
      .then((data) => {
        setContratos(data);
        if (data.length === 1) setIdContrato(data[0].id_contrato);
      })
      .finally(() => setLoadingContratos(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const err = validate(password);
    const confirmErr =
      password !== passwordConfirmacion ? 'Las contraseñas no coinciden' : '';
    const contratoErr = !idContrato ? 'Debes seleccionar un servicio' : '';

    setFieldError(err);
    setConfirmError(confirmErr);
    setContratoError(contratoErr);

    if (err || confirmErr || contratoErr) return;

    setResult(null);
    startTransition(async () => {
      const res = await changeWifiPassword(
        idContrato as number,
        password,
        passwordConfirmacion,
      );
      setResult(res);
      if (res.success) {
        setPassword('');
        setPasswordConfirmacion('');
      }
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wifi-contrato" className="text-xs font-medium text-muted">
            Servicio contratado
          </label>
          <select
            id="wifi-contrato"
            value={idContrato}
            onChange={(e) => {
              setIdContrato(e.target.value ? Number(e.target.value) : '');
              if (contratoError) setContratoError('');
            }}
            disabled={loadingContratos}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {loadingContratos ? 'Cargando servicios...' : 'Selecciona un servicio'}
            </option>
            {contratos.map((c) => (
              <option key={c.id_contrato} value={c.id_contrato}>
                {c.nombre}
              </option>
            ))}
          </select>
          {contratoError && <p className="text-xs text-error">{contratoError}</p>}
          {!loadingContratos && contratos.length === 0 && (
            <p className="text-xs text-error">No tienes servicios activos disponibles</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="wifi-password" className="text-xs font-medium text-muted">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="wifi-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldError) setFieldError(validate(e.target.value));
                if (confirmError && passwordConfirmacion) {
                  setConfirmError(
                    e.target.value !== passwordConfirmacion
                      ? 'Las contraseñas no coinciden'
                      : '',
                  );
                }
              }}
              placeholder="Ej: MiRed2024!"
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
          {fieldError && <p className="text-xs text-error">{fieldError}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="wifi-password-confirm" className="text-xs font-medium text-muted">
            Confirmar nueva contraseña
          </label>
          <div className="relative">
            <input
              id="wifi-password-confirm"
              type={showConfirmacion ? 'text' : 'password'}
              value={passwordConfirmacion}
              onChange={(e) => {
                setPasswordConfirmacion(e.target.value);
                if (confirmError) {
                  setConfirmError(
                    e.target.value !== password ? 'Las contraseñas no coinciden' : '',
                  );
                }
              }}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowConfirmacion((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={showConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirmacion ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmError && <p className="text-xs text-error">{confirmError}</p>}
        </div>

        <ul className="flex flex-col gap-1">
          {REQUISITOS.map((req) => {
            const ok = req.cumplido(password);
            return (
              <li
                key={req.label}
                className={`flex items-center gap-1.5 text-xs ${
                  ok ? 'text-success' : 'text-muted'
                }`}
              >
                {ok ? (
                  <CheckCircle2 size={12} className="shrink-0" />
                ) : (
                  <AlertCircle size={12} className="shrink-0" />
                )}
                {req.label}
              </li>
            );
          })}
        </ul>

        {result?.error && <p className="text-xs text-error">{result.error}</p>}

        <button
          type="submit"
          disabled={isPending || loadingContratos || contratos.length === 0}
          className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Enviando solicitud...' : 'Solicitar cambio'}
        </button>
      </form>
    </div>
  );
}
