import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import FormularioContratacion from "../../_components/catalog/FormularioContratacion";
import { getPlanById, getPlanes } from "../../_data/planes";
import { productJsonLd, breadcrumbJsonLd } from "../../_lib/jsonld";

type ContratarPlanPageProps = {
  params: Promise<{
    planId: string;
  }>;
};

export function generateStaticParams() {
  return getPlanes().map((plan) => ({
    planId: plan.id,
  }));
}

export async function generateMetadata({
  params,
}: ContratarPlanPageProps): Promise<Metadata> {
  const { planId } = await params;
  const plan = getPlanById(planId);

  if (!plan) {
    return { title: "Plan no encontrado" };
  }

  return {
    title: `Contratar ${plan.nombre}`,
    description: `Solicita la contratacion de ${plan.nombre} — ${plan.descripcion} por ${plan.precio}/mes. Internet fibra optica en La Pintana y Puente Alto.`,
    openGraph: {
      title: `Contratar ${plan.nombre} | Finet`,
      description: `${plan.nombre} por ${plan.precio}/mes. Fibra optica en La Pintana.`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ContratarPlanPage({ params }: ContratarPlanPageProps) {
  const { planId } = await params;
  const plan = getPlanById(planId);

  if (!plan) {
    redirect("/planes");
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finet.cl";

  return (
    <section className="px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: productJsonLd(plan),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbJsonLd([
            { name: "Inicio", url: baseUrl },
            { name: "Planes", url: `${baseUrl}/planes` },
            { name: plan.nombre, url: `${baseUrl}/contratar/${plan.id}` },
          ]),
        }}
      />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl mb-4">
        <ol className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <li>
            <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors">
              Inicio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/planes" className="hover:text-[var(--color-foreground)] transition-colors">
              Planes
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-[var(--color-foreground)] truncate max-w-[200px]">
            {plan.nombre}
          </li>
        </ol>
      </nav>
      <div className="mx-auto grid max-w-7xl gap-4">
        <h1 className="text-2xl font-medium">Solicitud de contratacion</h1>
        <p className="text-[var(--color-muted)]">
          Plan seleccionado: <strong>{plan.nombre}</strong> &mdash; {plan.precio}/mes
        </p>
        <FormularioContratacion plan={plan} />
      </div>
    </section>
  );
}
