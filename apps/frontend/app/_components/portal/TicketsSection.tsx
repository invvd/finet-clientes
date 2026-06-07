import { Inbox } from 'lucide-react';
import type { Ticket } from '@/app/portal/_lib/portal-api';

const ticketStatusConfig: Record<string, { label: string; className: string }> = {
  abierto: {
    label: 'Abierto',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  en_proceso: {
    label: 'En proceso',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  resuelto: {
    label: 'Resuelto',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  cerrado: {
    label: 'Cerrado',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

function defaultStatusConfig(status: string) {
  return {
    label: status,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
                  <span className="text-xs font-mono text-muted">
                    {ticket.codigo_seguimiento}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </span>
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
