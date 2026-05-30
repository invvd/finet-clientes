import Link from "next/link";
import type { Plan } from "../data/planes";

type PlanCardProps = {
  plan: Plan;
};

export default function PlanCard({ plan }: PlanCardProps) {
  return (
    <article className="border p-4">
      <h2 className="text-xl font-semibold">{plan.nombre}</h2>
      <p>{plan.descripcion}</p>
      <p className="font-semibold">{plan.precio}</p>
      <ul className="list-disc pl-5">
        {plan.caracteristicas.map((caracteristica) => (
          <li key={caracteristica}>{caracteristica}</li>
        ))}
      </ul>
      <Link href={`/contratar/${plan.id}`} className="inline-block border px-3 py-2">
        Contratar ahora
      </Link>
    </article>
  );
}
