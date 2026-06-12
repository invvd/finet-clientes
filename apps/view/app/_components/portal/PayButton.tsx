'use client';

import { useState, useTransition } from 'react';
import { CreditCard } from 'lucide-react';
import { initiatePayment } from '@/app/portal/_lib/portal-actions';

export default function PayButton() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handlePay = () => {
    setError('');
    startTransition(async () => {
      const result = await initiatePayment();
      if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setError(result.error ?? 'No se pudo iniciar el pago');
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handlePay}
        disabled={isPending}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-sm hover:shadow-md hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CreditCard size={16} aria-hidden />
        {isPending ? 'Redirigiendo...' : 'Pagar en línea'}
      </button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
