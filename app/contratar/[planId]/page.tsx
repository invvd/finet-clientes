import { notFound } from "next/navigation";
import FormularioContratacion from "../../components/FormularioContratacion";
import { getPlanById, getPlanes } from "../../data/planes";

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
    notFound();
  }

  return (
    <main className="grid gap-4 p-6">
      <h1 className="text-2xl font-semibold">Solicitud de contratacion</h1>
      <p>
        Plan seleccionado: <strong>{plan.nombre}</strong>
      </p>
      <FormularioContratacion plan={plan} />
    </main>
  );
}
