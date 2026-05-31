export type ContractStatus = 'Activo' | 'En Trámite' | 'Suspendido';

export interface Plan {
  id: string;
  name: string;
}

export interface PortalContract {
  status: ContractStatus;
  plans: Plan[];
  userName: string;
}

export interface Balance {
  amount: number;
  dueDate: string;
}

export interface Ticket {
  code: string;
  status: 'Abierto' | 'En proceso' | 'Resuelto';
  createdAt: string;
  description: string;
}

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error('API_URL no está configurada en las variables de entorno');
  return `${base}${path}`;
}

export async function getContract(): Promise<PortalContract> {
  const res = await fetch(apiUrl('/portal/contract'), { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener la información del contrato');
  return res.json();
}

export async function getBalance(): Promise<Balance> {
  const res = await fetch(apiUrl('/portal/balance'), { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener el estado de cuenta');
  return res.json();
}

export async function getTickets(): Promise<Ticket[]> {
  const res = await fetch(apiUrl('/portal/tickets'), { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener el historial de tickets');
  return res.json();
}
