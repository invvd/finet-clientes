import Link from "next/link";
import type { Plan } from "../../_data/planes";

type PlanCardProps = {
  plan: Plan;
};

export default function PlanCard({ plan }: PlanCardProps) {
  return (
    <article className="border border-[var(--color-border)] p-4">
      <h2 className="text-lg font-medium">{plan.nombre}</h2>
      <p className="text-sm text-[var(--color-muted)]">{plan.descripcion}</p>
      <p className="font-medium">{plan.precio}</p>
      <ul className="list-disc pl-5 text-sm">
        {plan.caracteristicas.map((caracteristica) => (
          <li key={caracteristica}>{caracteristica}</li>
        ))}
      </ul>
      <Link
        href={`/contratar/${plan.id}`}
        className="inline-flex border border-[var(--color-border)] px-3 py-2 text-sm"
      >
        Contratar ahora
      </Link>
    </article>
  );
}
