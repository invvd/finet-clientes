import StatusBadge, { type StatusTone } from '@/app/_components/ui/StatusBadge';

const statusConfig: Record<string, { label: string; tone: StatusTone }> = {
  activo: { label: 'Activo', tone: 'success' },
  suspendido: { label: 'Suspendido', tone: 'warning' },
  en_tramite: { label: 'En Trámite', tone: 'warning' },
  cortado: { label: 'Cortado', tone: 'error' },
  inactivo: { label: 'Inactivo', tone: 'neutral' },
};

const defaultConfig: { label: string; tone: StatusTone } = {
  label: 'Desconocido',
  tone: 'neutral',
};

export default function ContractStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    ...defaultConfig,
    label: status,
  };

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-3 h-full">
      <p className="text-sm font-medium text-muted">Estado del Servicio</p>
      <StatusBadge tone={config.tone} className="text-sm">
        {config.label}
      </StatusBadge>
    </div>
  );
}
