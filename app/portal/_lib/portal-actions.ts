'use server';

import { cookies } from 'next/headers';

// RF-24: Solo caracteres alfanuméricos, validado también en servidor
const WIFI_PASSWORD_REGEX = /^[a-zA-Z0-9]+$/;
const WIFI_PASSWORD_MIN = 8;
const WIFI_PASSWORD_MAX = 63; // WPA2 máximo

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error('API_URL no está configurada en las variables de entorno');
  return `${base}${path}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function changeWifiPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  // Validación server-side (no confiar solo en el cliente)
  if (typeof password !== 'string' || password.trim().length === 0) {
    return { success: false, error: 'Contraseña inválida' };
  }
  const sanitized = password.trim();
  if (sanitized.length < WIFI_PASSWORD_MIN || sanitized.length > WIFI_PASSWORD_MAX) {
    return {
      success: false,
      error: `La contraseña debe tener entre ${WIFI_PASSWORD_MIN} y ${WIFI_PASSWORD_MAX} caracteres`,
    };
  }
  if (!WIFI_PASSWORD_REGEX.test(sanitized)) {
    return { success: false, error: 'Solo se permiten caracteres alfanuméricos' };
  }

  try {
    const res = await fetch(apiUrl('/portal/wifi/password'), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ password: sanitized }),
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
