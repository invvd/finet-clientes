export interface Plan {
  id: number;
  name: string;
}

export default function PlanSummarySection({ plans }: { plans: Plan[] }) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-3 h-full">
      <p className="text-sm font-medium text-muted">
        {plans.length === 1 ? 'Plan Contratado' : 'Planes Contratados'}
      </p>

      {plans.length === 1 ? (
        <p className="text-xl font-bold text-foreground">{plans[0].name}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              {plan.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
