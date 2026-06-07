const statusConfig: Record<string, { label: string; className: string }> = {
  activo: {
    label: 'Activo',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  suspendido: {
    label: 'Suspendido',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  en_tramite: {
    label: 'En Trámite',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  cortado: {
    label: 'Cortado',
    className: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300',
  },
  inactivo: {
    label: 'Inactivo',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

const defaultConfig = {
  label: 'Desconocido',
  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function ContractStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    ...defaultConfig,
    label: status,
  };

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
