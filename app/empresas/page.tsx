import type { Metadata } from "next";
import PlanCard from "../_components/catalog/PlanCard";
import { getLandingPlanes } from "../_lib/api";

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

export default async function EmpresasPage() {
  const planes = await getLandingPlanes("EMPRESARIAL");
  const sorted = [...planes].sort((a, b) => a.precio_mensual - b.precio_mensual);

  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Ofertas y servicios corporativos</h1>
          <p className="text-[var(--color-muted)] mt-2 max-w-2xl mx-auto">
            Internet fibra optica de alta disponibilidad para empresas, pymes e
            instituciones. Facturacion empresa, soporte comercial dedicado y
            SLA garantizado.
          </p>
        </div>
        {sorted.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {sorted.map((plan) => (
              <PlanCard key={plan.id_plan} plan={plan} />
            ))}
          </div>
        ) : (
          <div className="text-center border border-[var(--color-border)] rounded-xl p-10 max-w-lg mx-auto">
            <p className="text-[var(--color-muted)]">
              El contenido corporativo no esta disponible temporalmente.
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-3">
              Contactanos directamente para recibir una cotizacion personalizada
              para tu empresa.
            </p>
            <p className="mt-4 text-sm font-medium text-[var(--color-foreground)]">
              WhatsApp:{" "}
              <a
                href="https://wa.me/569XXXXXXXX"
                className="text-[var(--color-primary)] hover:underline"
              >
                +56 9 XXXX XXXX
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
