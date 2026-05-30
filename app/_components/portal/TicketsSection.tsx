import { Inbox } from 'lucide-react';
import type { Ticket } from '@/app/portal/_lib/portal-api';

const ticketStatusConfig: Record<
  Ticket['status'],
  { label: string; className: string }
> = {
  Abierto: {
    label: 'Abierto',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  'En proceso': {
    label: 'En proceso',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  Resuelto: {
    label: 'Resuelto',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

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
            const statusCfg = ticketStatusConfig[ticket.status];
            return (
              <li
                key={ticket.code}
                className="rounded-xl border border-border bg-background p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-muted">{ticket.code}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-foreground">{ticket.description}</p>
                <p className="text-xs text-muted">{formatDate(ticket.createdAt)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
