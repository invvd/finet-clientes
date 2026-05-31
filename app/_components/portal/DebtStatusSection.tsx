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
  const isUpToDate = balance.amount === 0;

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
              <p className="text-2xl font-bold text-foreground">{formatCLP(balance.amount)}</p>
            </div>
            <p className="text-sm text-muted">
              Fecha límite de pago:{' '}
              <span className="font-semibold text-foreground">{formatDate(balance.dueDate)}</span>
            </p>
          </div>
          <PayButton />
        </div>
      )}
    </div>
  );
}
