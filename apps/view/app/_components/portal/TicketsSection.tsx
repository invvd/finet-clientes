import { Inbox } from 'lucide-react';
import type { Ticket } from '@/app/portal/_lib/portal-api';
import StatusBadge, { type StatusTone } from '@/app/_components/ui/StatusBadge';

const ticketStatusConfig: Record<string, { label: string; tone: StatusTone }> = {
  abierto: { label: 'Abierto', tone: 'info' },
  en_proceso: { label: 'En proceso', tone: 'warning' },
  resuelto: { label: 'Resuelto', tone: 'success' },
  cerrado: { label: 'Cerrado', tone: 'neutral' },
};

function defaultStatusConfig(status: string): { label: string; tone: StatusTone } {
  return {
    label: status,
    tone: 'neutral',
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function TicketsSection({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-4">
      <p className="text-sm font-medium text-muted">Tickets de Soporte</p>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Inbox className="text-muted" size={40} strokeWidth={1.5} />
          <p className="text-sm text-muted">No tienes solicitudes de soporte registradas.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const statusCfg =
              ticketStatusConfig[ticket.estado] ?? defaultStatusConfig(ticket.estado);
            return (
              <li
                key={ticket.id_ticket}
                className="rounded-xl border border-border bg-background p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    {ticket.codigo_seguimiento}
                  </span>
                  <StatusBadge tone={statusCfg.tone}>{statusCfg.label}</StatusBadge>
                </div>
                <p className="text-sm text-foreground">{ticket.descripcion}</p>
                <p className="text-xs text-muted">{formatDate(ticket.fecha_creacion)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
