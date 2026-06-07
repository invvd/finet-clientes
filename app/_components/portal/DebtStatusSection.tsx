import { CheckCircle, AlertCircle } from 'lucide-react';
import type { Balance } from '@/app/portal/_lib/portal-api';
import PayButton from './PayButton';

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function DebtStatusSection({ balance }: { balance: Balance }) {
  const isUpToDate = balance.tiene_deuda === false && balance.saldo_confirmado !== false;

  // CU-27 Excepción 3: saldo no confirmado por inconsistencia en el sistema
  if (balance.saldo_confirmado === false) {
    return (
      <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-3">
        <p className="text-sm font-medium text-muted">Estado de Cuenta</p>
        <div className="flex items-center gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={28} />
          <p className="text-base font-semibold text-amber-700 dark:text-amber-400">
            No se pudo determinar tu estado de cuenta en este momento.
          </p>
        </div>
        <p className="text-sm text-muted">
          El saldo presenta inconsistencias. Contacta al administrador si el problema persiste.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 shadow-sm flex flex-col gap-3 ${
        isUpToDate ? 'bg-green-50 dark:bg-green-900/20' : 'bg-surface'
      }`}
    >
      <p className="text-sm font-medium text-muted">Estado de Cuenta</p>

      {isUpToDate ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600 dark:text-green-400 shrink-0" size={28} />
          <p className="text-base font-semibold text-green-800 dark:text-green-300">
            ¡Todo al día! No tienes pagos pendientes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={28} />
              <p className="text-2xl font-bold text-foreground">{formatCLP(balance.saldo_total)}</p>
            </div>
            {balance.facturas_pendientes.length > 0 && (
              <p className="text-sm text-muted">
                {balance.facturas_pendientes.length} factura
                {balance.facturas_pendientes.length !== 1 ? 's' : ''} pendiente
                {balance.facturas_pendientes.length !== 1 ? 's' : ''}
              </p>
            )}
            {balance.facturas_pendientes
              .filter((f) => f.fecha_limite_pago)
              .sort(
                (a, b) =>
                  new Date(a.fecha_limite_pago).getTime() -
                  new Date(b.fecha_limite_pago).getTime(),
              )
              .slice(0, 1)
              .map((f) => (
                <p key={f.id_factura} className="text-xs text-muted">
                  {f.estado === 'vencida'
                    ? `Vencida: ${formatDate(f.fecha_limite_pago)}`
                    : `Vence: ${formatDate(f.fecha_limite_pago)}`}
                </p>
              ))}
          </div>
          <PayButton />
        </div>
      )}
    </div>
  );
}
