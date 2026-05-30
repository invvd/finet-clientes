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

const API_URL = process.env.API_URL;

// Mock data used when API_URL is not set (desarrollo local)
const mockContract: PortalContract = {
  status: 'Activo',
  userName: 'Juan Pérez',
  plans: [
    { id: '1', name: 'Fibra 200 Megas' },
    { id: '2', name: 'TV Digital Básico' },
  ],
};

const mockBalance: Balance = {
  amount: 24990,
  dueDate: '2026-06-10',
};

const mockTickets: Ticket[] = [
  {
    code: 'TK-20260501-AB3',
    status: 'En proceso',
    createdAt: '2026-05-01',
    description: 'Sin señal en decodificador TV',
  },
  {
    code: 'TK-20260415-CC7',
    status: 'Resuelto',
    createdAt: '2026-04-15',
    description: 'Velocidad de internet reducida',
  },
];

// Datos del usuario: no cachear globalmente, cada request es por usuario autenticado
export async function getContract(): Promise<PortalContract> {
  if (!API_URL) return mockContract;
  const res = await fetch(`${API_URL}/portal/contract`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener el contrato');
  return res.json();
}

export async function getBalance(): Promise<Balance> {
  if (!API_URL) return mockBalance;
  const res = await fetch(`${API_URL}/portal/balance`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener el saldo');
  return res.json();
}

export async function getTickets(): Promise<Ticket[]> {
  if (!API_URL) return mockTickets;
  const res = await fetch(`${API_URL}/portal/tickets`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener los tickets');
  return res.json();
}
