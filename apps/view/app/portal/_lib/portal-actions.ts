'use server';

import { cookies } from 'next/headers';

const WIFI_PASSWORD_MIN = 8;
const WIFI_PASSWORD_MAX = 63; // WPA2 máximo

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error('API_URL no está configurada en las variables de entorno');
  return `${base}${path}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface ContratoParaWifi {
  id_contrato: number;
  nombre: string;
}

// Server Action: trae los contratos vigentes del cliente para el selector
// de servicio en el formulario de cambio de contraseña WiFi (CU-31/32).
// Server Action porque necesita process.env.API_URL y el token de la
// cookie httpOnly, ninguno disponible en un Client Component.
export async function getContratosParaWifi(): Promise<ContratoParaWifi[]> {
  try {
    const res = await fetch(apiUrl('/portal/contratos/vigentes'), {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      id_contrato: number;
      plan: { nombre_comercial: string } | null;
    }>;
    return data.map((c) => ({
      id_contrato: c.id_contrato,
      nombre: c.plan?.nombre_comercial ?? `Contrato #${c.id_contrato}`,
    }));
  } catch {
    return [];
  }
}

export async function changeWifiPassword(
  idContrato: number,
  password: string,
  passwordConfirmacion: string,
): Promise<{ success: boolean; error?: string }> {
  if (!idContrato) {
    return { success: false, error: 'Debe seleccionar un servicio' };
  }
  if (typeof password !== 'string' || password.length === 0) {
    return { success: false, error: 'Contraseña inválida' };
  }
  if (password.length < WIFI_PASSWORD_MIN || password.length > WIFI_PASSWORD_MAX) {
    return {
      success: false,
      error: `La contraseña debe tener entre ${WIFI_PASSWORD_MIN} y ${WIFI_PASSWORD_MAX} caracteres`,
    };
  }
  if (/\s/.test(password)) {
    return { success: false, error: 'No se permiten espacios' };
  }
  if (password !== passwordConfirmacion) {
    return { success: false, error: 'Las contraseñas no coinciden' };
  }

  try {
    const res = await fetch(apiUrl('/portal/wifi/password'), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
  id_contrato: idContrato,
  password,
  password_confirmacion: passwordConfirmacion,
}),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (data as { message?: string }).message ?? 'Error al cambiar la contraseña',
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor' };
  }
}

export async function initiatePayment(): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch(apiUrl('/portal/payment/initiate'), {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return { success: false, error: 'No se pudo iniciar el proceso de pago' };
    const data = (await res.json()) as { redirectUrl: string };
    return { success: true, redirectUrl: data.redirectUrl };
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor' };
  }
}
