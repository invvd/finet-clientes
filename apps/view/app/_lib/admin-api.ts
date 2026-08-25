const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const ADMIN_API_KEY_STORAGE = "finet:admin:api-key";

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type IpBloqueada = {
  ip: string;
  total_intentos: number;
  bloqueos_activos: number;
  ultimo_intento: string;
  bloqueado: boolean;
  bloqueado_hasta: string | null;
};

export type HistorialIps = {
  data: IpBloqueada[];
  total: number;
  page: number;
  limit: number;
};

export type ReporteFinanciero = {
  periodo: { desde: string; hasta: string };
  generado_en: string;
  resumen: {
    total_ingresos: number;
    total_deudas: number;
    cantidad_pagos: number;
    cantidad_facturas_pendientes: number;
  };
  ingresos: Array<{
    id_pago: number;
    fecha_pago: string;
    monto: number;
    pasarela: string;
    cliente: string | null;
  }>;
  deudas: Array<{
    id_factura: number;
    periodo: string;
    fecha_emision: string | null;
    fecha_limite_pago: string;
    monto: number;
    estado: string;
    cliente: string | null;
  }>;
};

async function obtenerMensaje(response: Response) {
  try {
    const body = await response.json();
    return typeof body.message === "string"
      ? body.message
      : "No fue posible completar la solicitud.";
  } catch {
    return "No fue posible completar la solicitud.";
  }
}

async function pedir<T>(
  apiKey: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new AdminApiError(await obtenerMensaje(response), response.status);
  }

  return response.json();
}

export function getHistorialIps(
  apiKey: string,
  filtros: {
    desde?: string;
    hasta?: string;
    ip?: string;
    soloBloqueadas: boolean;
    page: number;
  },
) {
  const params = new URLSearchParams({
    resumen: "true",
    page: String(filtros.page),
    limit: "20",
  });
  if (filtros.soloBloqueadas) params.set("bloqueados", "true");
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (filtros.ip) params.set("ip", filtros.ip);
  return pedir<HistorialIps>(apiKey, `/intentos-fallidos?${params}`);
}

export function desbloquearIp(apiKey: string, ip: string) {
  return pedir<{ desbloqueado: boolean; registros_afectados: number }>(
    apiKey,
    "/intentos-fallidos/desbloquear-ip",
    { method: "POST", body: JSON.stringify({ ip }) },
  );
}

export function generarReporteFinanciero(
  apiKey: string,
  periodo: { desde: string; hasta: string },
) {
  const params = new URLSearchParams(periodo);
  return pedir<ReporteFinanciero>(apiKey, `/reportes/financiero?${params}`);
}

export async function descargarReporteFinanciero(
  apiKey: string,
  periodo: { desde: string; hasta: string },
) {
  const params = new URLSearchParams(periodo);
  const response = await fetch(
    `${API_URL}/admin/reportes/financiero/descarga?${params}`,
    { headers: { "X-API-Key": apiKey } },
  );

  if (!response.ok) {
    throw new AdminApiError(await obtenerMensaje(response), response.status);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const nombre = disposition.match(/filename="([^"]+)"/)?.[1] ?? "reporte.csv";
  return { nombre, blob: await response.blob() };
}
