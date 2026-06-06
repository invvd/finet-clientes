import PrimaryButton from "../ui/PrimaryButton";
import type { Plan } from "../../_data/planes";

type PlanCardProps = {
  plan: Plan;
  featured?: boolean;
};

export default function PlanCard({ plan, featured }: PlanCardProps) {
  return (
    <article
      className={`relative border border-[var(--color-border)] p-6 rounded-xl transition-all hover:shadow-md hover:border-[var(--color-primary)] ${
        featured ? "ring-2 ring-[var(--color-primary)]" : ""
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-4 py-0.5 text-xs font-bold text-[var(--color-foreground)]">
          Mas popular
        </span>
      )}
      <h2 className="text-lg font-medium">{plan.nombre}</h2>
      <p className="text-4xl font-extrabold text-[var(--color-foreground)] mt-2">
        {plan.precio}
        <span className="text-sm font-normal text-[var(--color-muted)]">/mes</span>
      </p>
      <p className="text-sm text-[var(--color-muted)] mt-1">{plan.descripcion}</p>
      <ul className="mt-4 grid gap-2 border-t border-[var(--color-border)] pt-4">
        {plan.caracteristicas.map((caracteristica) => (
          <li
            key={caracteristica}
            className="flex items-start gap-2 text-sm text-[var(--color-foreground)]"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {caracteristica}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <PrimaryButton
          href={`/contratar/${plan.id}`}
          variant="solid"
          className="w-full"
        >
          Contratar {plan.nombre}
        </PrimaryButton>
      </div>
    </article>
  );
}
