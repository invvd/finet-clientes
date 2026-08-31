import { revalidateTag } from "next/cache";

/**
 * Publica los cambios del editor de cobertura (CU-59 / CU-60).
 *
 * El mapa publico cachea 24 h (`revalidate: 86400` en `_lib/api.ts`), que es lo
 * que pide el CU-60. Sin esto, un cambio del administrador tardaria hasta un dia
 * en verse. Al invalidar el tag, el proximo visitante ya recibe la version nueva.
 *
 * Requiere la misma `ADMIN_API_KEY` que el backend — hay que definirla tambien
 * en `apps/view/.env`, porque este handler corre en Next, no en NestJS.
 */
export async function POST(request: Request) {
  const claveEsperada = process.env.ADMIN_API_KEY;

  if (!claveEsperada) {
    return Response.json(
      { message: "ADMIN_API_KEY no esta configurada en el frontend" },
      { status: 500 }
    );
  }

  if (request.headers.get("x-api-key") !== claveEsperada) {
    return Response.json({ message: "Clave invalida" }, { status: 401 });
  }

  // Next 16 pide un perfil de caché junto al tag: `expire: 0` significa que no
  // se puede seguir sirviendo nada de lo cacheado, ni por un segundo — que es
  // justo lo que se espera al apretar "Publicar".
  revalidateTag("cobertura", { expire: 0 });

  return Response.json({ publicado_en: new Date().toISOString() });
}
