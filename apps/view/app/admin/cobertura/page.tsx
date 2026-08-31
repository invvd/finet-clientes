import type { Metadata } from "next";
import EditorCobertura from "../../_components/cobertura/EditorCobertura";

/**
 * Editor de cobertura del administrador (CU-59 / CU-60).
 *
 * Ruta provisional: el panel de administración definitivo todavía no existe.
 * Cuando exista, esta página se mueve dentro de él sin tocar el backend — todo
 * el estado vive en `/api/admin/cobertura/*`.
 *
 * No hay sesión de administrador todavía: el acceso lo controla la `ADMIN_API_KEY`
 * que exige el backend en cada request. Por eso `robots: noindex` — la página no
 * expone datos sin la clave, pero tampoco tiene por qué aparecer en buscadores.
 */
export const metadata: Metadata = {
  title: "Editor de cobertura",
  robots: { index: false, follow: false },
};

export default function EditorCoberturaPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">
        Editor de cobertura
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Dibujá un polígono para cubrir el grueso de una zona y usá el pincel para
        el detalle fino. Los cambios se guardan solos; &quot;Publicar&quot; los
        deja visibles en el mapa del sitio.
      </p>

      <div className="mt-8">
        <EditorCobertura />
      </div>
    </section>
  );
}
