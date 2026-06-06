import type { Metadata } from "next";
import PlanCard from "../_components/catalog/PlanCard";
import { getPlanes } from "../_data/planes";
import { itemListJsonLd } from "../_lib/jsonld";

export const metadata: Metadata = {
  title: "Planes de Internet Fibra Optica",
  description:
    "Descubre nuestros planes de Internet fibra optica desde $19.990. Fibra Hogar, Fibra Plus y Fibra Empresa en La Pintana, Puente Alto y La Florida. Contrata hoy.",
  openGraph: {
    title: "Planes de Internet Fibra Optica | Finet",
    description:
      "Planes desde $19.990 con fibra optica simetrica en La Pintana y Puente Alto.",
  },
};

export default function PlanesPage() {
  const planes = getPlanes();

  return (
    <section className="px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: itemListJsonLd(planes),
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Planes de Internet Fibra Optica</h1>
          <p className="text-[var(--color-muted)] mt-2 max-w-2xl mx-auto">
            Conexion simetrica de alta velocidad para tu hogar o empresa. Sin
            limites de datos, instalacion incluida y soporte local en La Pintana.
          </p>
        </div>
        {planes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {planes.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                featured={plan.id === "fibra-plus"}
              />
            ))}
          </div>
        ) : (
          <p className="text-[var(--color-muted)] text-center">
            No hay planes disponibles temporalmente.
          </p>
        )}
      </div>
    </section>
  );
}
