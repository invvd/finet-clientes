'use server';

import { revalidatePath } from 'next/cache';

/**
 * Panel provisorio — PROVISORIO, SE BORRA.
 *
 * Existe solo para poder probar a mano CU-80, CU-54, CU-47, CU-55 y CU-56 mientras el panel
 * administrativo real (que hace otro grupo) no existe. No sigue el diseño del sitio ni
 * pretende hacerlo.
 *
 * La `ADMIN_API_KEY` se lee acá, en el servidor, y nunca llega al navegador.
 */

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error('API_URL no está configurada');
  return `${base}${path}`;
}

function headers(): HeadersInit {
  const key = process.env.ADMIN_API_KEY;
  if (!key) throw new Error('ADMIN_API_KEY no está configurada en apps/view/.env');
  return { 'Content-Type': 'application/json', 'x-api-key': key };
}

export type Resultado<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

async function pedir<T>(
  path: string,
  init: RequestInit = {},
): Promise<Resultado<T>> {
  try {
    const res = await fetch(apiUrl(path), {
      ...init,
      headers: headers(),
      cache: 'no-store',
    });
    const cuerpo: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const d = cuerpo as { message?: unknown; errors?: { message: string }[] } | null;
      const detalle = d?.errors?.map((e) => e.message).join(' · ');
      const mensaje =
        detalle ||
        (typeof d?.message === 'string' ? d.message : null) ||
        `Error ${res.status}`;
      return { ok: false, status: res.status, error: mensaje };
    }

    return { ok: true, data: cuerpo as T };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: `No se pudo conectar con el backend (${apiUrl(path)}). ¿Está corriendo? ${String(e)}`,
    };
  }
}

// ─── CU-80 ────────────────────────────────────────────────────────────────────

export type Configuracion = {
  dias_gracia: number;
  umbral_suspension: number;
  fecha_actualizacion: string | null;
};

export async function leerConfiguracion() {
  return pedir<Configuracion>('/admin/morosidad/configuracion');
}

export async function guardarConfiguracion(_prev: unknown, form: FormData) {
  const r = await pedir<Configuracion>('/admin/morosidad/configuracion', {
    method: 'PUT',
    body: JSON.stringify({
      dias_gracia: Number(form.get('dias_gracia')),
      umbral_suspension: Number(form.get('umbral_suspension')),
    }),
  });
  revalidatePath('/admin-tmp/parametros');
  return r;
}

// ─── CU-47 ────────────────────────────────────────────────────────────────────

export type ResultadoRevision = {
  inicio: string;
  fin: string;
  contratos_procesados: number;
  contratos_marcados: number;
  contratos_omitidos: number;
  ids_marcados: number[];
  ids_truncados: boolean;
};

export async function dispararRevision() {
  const r = await pedir<ResultadoRevision>('/admin/morosidad/revision', {
    method: 'POST',
  });
  revalidatePath('/admin-tmp/cartera');
  return r;
}

// ─── CU-54 ────────────────────────────────────────────────────────────────────

export async function asignarDiaVencimiento(_prev: unknown, form: FormData) {
  const id = Number(form.get('id_contrato'));
  return pedir<{ id_contrato: number; dia_vencimiento: number }>(
    `/admin/contratos/${id}/dia-vencimiento`,
    {
      method: 'PATCH',
      body: JSON.stringify({ dia_vencimiento: Number(form.get('dia_vencimiento')) }),
    },
  );
}

// ─── CU-55 ────────────────────────────────────────────────────────────────────

export type ContratoVencido = {
  id_contrato: number;
  rut: string | null;
  nombre_completo: string | null;
  saldo_vencido: number;
  facturas_vencidas: number;
  dias_vencido: number;
};

export async function listarCartera(page: number, limit: number) {
  return pedir<{
    data: ContratoVencido[];
    total: number;
    page: number;
    limit: number;
  }>(`/admin/morosidad/contratos-vencidos?page=${page}&limit=${limit}`);
}

// ─── CU-56 ────────────────────────────────────────────────────────────────────

export type DetalleContrato = {
  id_contrato: number;
  estado: string;
  dia_vencimiento: number;
  plan: string | null;
  cliente: {
    rut: string | null;
    nombre_completo: string;
    email: string | null;
    telefono: string | null;
  } | null;
  saldo_vencido: number;
  facturas: {
    id_factura: number;
    periodo: string;
    monto: number;
    fecha_limite_pago: string;
    estado: string;
    dias_vencida: number | null;
  }[];
  historial_pagos: {
    id_pago: number;
    monto: number;
    fecha_pago: string;
    pasarela: string;
  }[];
};

export async function leerDetalle(id: number) {
  return pedir<DetalleContrato>(`/admin/morosidad/contratos-vencidos/${id}`);
}
