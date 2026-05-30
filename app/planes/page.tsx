import PlanCard from "../components/PlanCard";
import { getPlanes } from "../data/planes";

export default function PlanesPage() {
  const planes = getPlanes();

  return (
    <main className="grid gap-6 p-6">
      <h1 className="text-2xl font-semibold">Planes de servicio</h1>
      {planes.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          {planes.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>
      ) : (
        <p>No hay planes disponibles temporalmente.</p>
      )}
    </main>
  );
}
