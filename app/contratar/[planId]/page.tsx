import { redirect } from "next/navigation";
import FormularioContratacion from "../../_components/catalog/FormularioContratacion";
import { getPlanById, getPlanes } from "../../_data/planes";

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

export default async function ContratarPlanPage({ params }: ContratarPlanPageProps) {
  const { planId } = await params;
  const plan = getPlanById(planId);

  if (!plan) {
    redirect("/planes");
  }

  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-4">
        <h1 className="text-2xl font-medium">Solicitud de contratacion</h1>
        <p className="text-[var(--color-muted)]">
          Plan seleccionado: <strong>{plan.nombre}</strong>
        </p>
        <FormularioContratacion plan={plan} />
      </div>
    </section>
  );
}
