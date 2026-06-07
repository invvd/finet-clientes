export interface Factura {
  id_factura: number;
  periodo: string;
  monto: number;
  fecha_limite_pago: string;
  estado: string;
  dias_vencida: number | null;
}

export interface Balance {
  tiene_deuda: boolean;
  saldo_total: number;
  saldo_confirmado: boolean;
  facturas_pendientes: Factura[];
}

export interface Ticket {
  id_ticket: number;
  codigo_seguimiento: string;
  estado: string;
  prioridad: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_cierre: string | null;
  categoria: string;
  origen: string | null;
}

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error('API_URL no está configurada en las variables de entorno');
  return `${base}${path}`;
}

export async function getDeuda(): Promise<Balance> {
  const res = await fetch(apiUrl('/portal/deuda'), { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener el estado de cuenta');
  return res.json();
}

export async function getTickets(limite?: number): Promise<Ticket[]> {
  const params = limite ? `?limite=${limite}` : '';
  const res = await fetch(apiUrl(`/portal/tickets${params}`), { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener el historial de tickets');
  return res.json();
}
