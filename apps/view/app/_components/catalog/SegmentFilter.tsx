"use client";

type Segmento = "todos" | "RESIDENCIAL" | "EMPRESARIAL";

type SegmentFilterProps = {
  value: Segmento;
  onChange: (value: Segmento) => void;
};

const opciones: { label: string; value: Segmento }[] = [
  { label: "Personas", value: "RESIDENCIAL" },
  { label: "Empresas", value: "EMPRESARIAL" },
  { label: "Todos", value: "todos" },
];

export default function SegmentFilter({ value, onChange }: SegmentFilterProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label="Filtrar por segmento">
      {opciones.map((opcion) => {
        const isActive = value === opcion.value;
        return (
          <button
            key={opcion.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opcion.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                : "border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
            }`}
          >
            {opcion.label}
          </button>
        );
      })}
    </div>
  );
}
