import type { Metadata } from "next";
import { getLandingPlanes } from "../_lib/api";
import { itemListJsonLd } from "../_lib/jsonld";
import PlanesClient from "../_components/catalog/PlanesClient";

export const metadata: Metadata = {
  title: "Planes de Internet Fibra Optica",
  description:
    "Descubre nuestros planes de Internet fibra optica. Fibra Hogar, Fibra Plus y Fibra Empresa en La Pintana, Puente Alto y La Florida. Contrata hoy.",
  openGraph: {
    title: "Planes de Internet Fibra Optica | Finet",
    description:
      "Planes con fibra optica simetrica en La Pintana y Puente Alto.",
  },
};

export default async function PlanesPage() {
  const planes = await getLandingPlanes();
  const sorted = [...planes].sort((a, b) => a.precio_mensual - b.precio_mensual);

  return (
    <section className="px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: itemListJsonLd(sorted),
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
        <PlanesClient planes={sorted} />
      </div>
    </section>
  );
}
