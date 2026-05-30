import PlanCard from "../_components/catalog/PlanCard";
import { getPlanes } from "../_data/planes";

export default function PlanesPage() {
  const planes = getPlanes();

  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-6">
        <h1 className="text-2xl font-medium">Planes de servicio</h1>
        {planes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {planes.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <p className="text-[var(--color-muted)]">No hay planes disponibles temporalmente.</p>
        )}
      </div>
    </section>
  );
}
