const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type PlanBackend = {
  id_plan: number;
  nombre_comercial: string;
  tipo_plan: string;
  tipo_cliente: string;
  velocidad_mbps: number | null;
  precio_mensual: number;
  descripcion: string | null;
};

function formatPrecio(precio: number): string {
  return `$${precio.toLocaleString("es-CL")}`;
}

export function formatPrecioMensual(precio: number): string {
  return formatPrecio(precio);
}

export async function getLandingPlanes(
  tipoCliente?: string
): Promise<PlanBackend[]> {
  try {
    const url = new URL(`${API_URL}/landing/planes`);
    if (tipoCliente) {
      url.searchParams.set("tipo_cliente", tipoCliente);
    }

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });

    if (!res.ok) {
      if (res.status === 404) return [];
      console.error(`Error al obtener planes: ${res.status}`);
      return [];
    }

    return res.json();
  } catch {
    console.error("Backend no disponible. Mostrando catalogo vacio.");
    return [];
  }
}

export async function getPlanById(
  planId: number
): Promise<PlanBackend | null> {
  const planes = await getLandingPlanes();
  return planes.find((p) => p.id_plan === planId) ?? null;
}
