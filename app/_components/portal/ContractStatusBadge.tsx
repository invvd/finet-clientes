import type { ContractStatus } from '@/app/portal/_lib/portal-api';

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  Activo: {
    label: 'Activo',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  'En Trámite': {
    label: 'En Trámite',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  Suspendido: {
    label: 'Suspendido',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

export default function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const config = statusConfig[status];

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-3 h-full">
      <p className="text-sm font-medium text-muted">Estado del Servicio</p>
      <span
        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    </div>
  );
}
