const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const SOPORTE_API_KEY_STORAGE = "finet_soporte_api_key";
export const SOPORTE_TECNICO_STORAGE = "finet_soporte_tecnico_id";

export class SoporteApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type TicketAsignado = {
  id_ticket: number;
  codigo_seguimiento: string | null;
  estado: string;
  prioridad: string;
  descripcion: string | null;
  fecha_creacion: string;
  fecha_cierre: string | null;
  categoria: string;
  cliente: string | null;
};

export type AccionTicket = {
  id_log: string;
  accion: string;
  detalle: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  fecha_hora: string;
  tecnico: string | null;
};

export type TicketDetalle = TicketAsignado & {
  historial: AccionTicket[];
};

export type TicketsAsignados = {
  total: number;
  tiene_tickets: boolean;
  tickets: TicketAsignado[];
};

async function pedir<T>(
  apiKey: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}/admin/soporte${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = "No fue posible completar la solicitud.";
    try {
      const body = await response.json();
      if (typeof body.message === "string") message = body.message;
    } catch {
      // La respuesta puede no incluir JSON.
    }
    throw new SoporteApiError(message, response.status);
  }

  return response.json();
}

export function getTicketsAsignados(apiKey: string, idUsuario: number) {
  return pedir<TicketsAsignados>(apiKey, `/tickets?id_usuario=${idUsuario}`);
}

export function getTicketDetalle(
  apiKey: string,
  idUsuario: number,
  idTicket: number,
) {
  return pedir<TicketDetalle>(
    apiKey,
    `/tickets/${idTicket}?id_usuario=${idUsuario}`,
  );
}

export function actualizarTicket(
  apiKey: string,
  idTicket: number,
  data: { id_usuario: number; estado: string; accion: string },
) {
  return pedir<TicketDetalle>(apiKey, `/tickets/${idTicket}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
