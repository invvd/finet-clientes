/**
 * Cliente del editor de cobertura (CU-59 / CU-60).
 *
 * Es un cuarto cliente de API ademas de los tres que documenta
 * `docs/conventions.md`, y a proposito: los otros no mandan `X-API-Key` ni
 * hablan con `/admin/*`. Se usa solo desde la pagina `/admin/cobertura`.
 *
 * Mientras no exista sesion de administrador, la clave la escribe el usuario y
 * vive en `sessionStorage` — se pierde al cerrar la pestana.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const BASE = `${API_URL}/admin/cobertura`;

export const CLAVE_SESSION_STORAGE = "finet:cobertura:api-key";

export type CeldaPintada = {
  latitud: number;
  longitud: number;
  densidad: number;
};

export type CeldaBorrada = { latitud: number; longitud: number };

export type PuntoPincel = {
  id_punto: number;
  latitud: number;
  longitud: number;
  densidad_cobertura: number | null;
  tipo_cobertura: string | null;
};

export type ZonaCobertura = {
  id_zona: number;
  nombre: string | null;
  densidad_cobertura: number;
  tipo_cobertura: string | null;
  vertices: [number, number][];
  activo: boolean;
  fecha_actualizacion: string | null;
};

export type ConfigVisor = {
  centro: { latitud: number; longitud: number };
  zoom_inicial: number;
  zoom_min: number;
  zoom_max: number;
  limites: {
    sur_oeste: { latitud: number; longitud: number };
    nor_este: { latitud: number; longitud: number };
  };
};

export type Lienzo = {
  paso_grilla: number;
  paso_grilla_publica: number;
  config: ConfigVisor;
  puntos: PuntoPincel[];
  zonas: ZonaCobertura[];
};

export type ResultadoTrazo = {
  pintadas: number;
  borradas: number;
  total_celdas: number;
};

/** El backend responde 401 con clave invalida; se distingue para poder pedirla de nuevo. */
export class ErrorApiKey extends Error {
  constructor() {
    super("La clave de administrador no es valida");
    this.name = "ErrorApiKey";
  }
}

async function pedir<T>(
  apiKey: string,
  ruta: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) throw new ErrorApiKey();

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${detalle}`.trim());
  }

  return res.json() as Promise<T>;
}

export function getLienzo(apiKey: string) {
  return pedir<Lienzo>(apiKey, "/lienzo");
}

export function aplicarTrazo(
  apiKey: string,
  trazo: {
    tipo_cobertura?: string;
    pintar?: CeldaPintada[];
    borrar?: CeldaBorrada[];
  }
) {
  return pedir<ResultadoTrazo>(apiKey, "/pincel", {
    method: "POST",
    body: JSON.stringify(trazo),
  });
}

export function limpiarPincel(apiKey: string) {
  return pedir<{ borradas: number }>(apiKey, "/pincel", { method: "DELETE" });
}

export function crearZona(
  apiKey: string,
  zona: {
    nombre?: string;
    densidad_cobertura: number;
    tipo_cobertura?: string;
    vertices: [number, number][];
  }
) {
  return pedir<ZonaCobertura>(apiKey, "/zonas", {
    method: "POST",
    body: JSON.stringify(zona),
  });
}

export function actualizarZona(
  apiKey: string,
  idZona: number,
  cambios: Partial<{
    nombre: string;
    densidad_cobertura: number;
    tipo_cobertura: string;
    vertices: [number, number][];
    activo: boolean;
  }>
) {
  return pedir<ZonaCobertura>(apiKey, `/zonas/${idZona}`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

export function eliminarZona(apiKey: string, idZona: number) {
  return pedir<{ id_zona: number }>(apiKey, `/zonas/${idZona}`, {
    method: "DELETE",
  });
}

/**
 * Publica los cambios: invalida la cache de 24 h del mapa publico para que el
 * sitio muestre la version nueva en el proximo request en vez de esperar un dia.
 * Pega contra el route handler de Next, no contra el backend.
 */
export async function publicarCobertura(
  apiKey: string
): Promise<{ publicado_en: string }> {
  const res = await fetch("/api/cobertura/revalidar", {
    method: "POST",
    headers: { "X-API-Key": apiKey },
  });

  if (res.status === 401) throw new ErrorApiKey();
  if (!res.ok) throw new Error(`No fue posible publicar (${res.status})`);

  return res.json();
}
