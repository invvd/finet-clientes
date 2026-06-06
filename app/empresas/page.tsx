import type { Metadata } from "next";
import { getServiciosCorporativos } from "../_data/serviciosCorporativos";

export const metadata: Metadata = {
  title: "Planes Empresa",
  description:
    "Soluciones de Internet fibra optica y conectividad para empresas y pymes en La Pintana, Puente Alto, La Florida y La Granja. Facturacion empresa y soporte comercial.",
  openGraph: {
    title: "Planes Empresa — Finet Fibra Optica",
    description:
      "Internet fibra optica corporativa para empresas en la zona sur de Santiago.",
  },
};

export default function EmpresasPage() {
  const servicios = getServiciosCorporativos();

  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-6">
        <h1 className="text-2xl font-medium">Ofertas y servicios corporativos</h1>
        {servicios.length > 0 ? (
          <div className="grid gap-4">
            {servicios.map((servicio) => (
              <article key={servicio.id} className="border border-[var(--color-border)] p-4">
                <h2 className="text-lg font-medium">{servicio.nombre}</h2>
                <p className="text-sm text-[var(--color-muted)]">{servicio.descripcion}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-[var(--color-muted)]">
            El contenido corporativo no esta disponible temporalmente.
          </p>
        )}
      </div>
    </section>
  );
}
