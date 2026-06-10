"use client";

function formatRut(value: string) {
  const digits = value.replace(/[^\dkK]/g, "").slice(0, 10);
  if (digits.length <= 1) return digits;
  const body = digits.slice(0, -1);
  const dv = digits.slice(-1);
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${dotted}-${dv}`;
}

export default function RutInput({
  value,
  error,
  onChange,
  onBlur,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label
        htmlFor="rut"
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        RUT
      </label>
      <input
        id="rut"
        type="text"
        inputMode="numeric"
        placeholder="12.345.678-9"
        value={value}
        onChange={(e) => onChange(formatRut(e.target.value))}
        onBlur={onBlur}
        data-error={!!error}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200
          data-[error=false]:border-border data-[error=false]:bg-background data-[error=false]:text-foreground data-[error=false]:placeholder:text-muted data-[error=false]:focus-visible:outline data-[error=false]:focus-visible:outline-2 data-[error=false]:focus-visible:outline-offset-0 data-[error=false]:focus-visible:outline-primary
          border-error bg-error-container text-foreground focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-error`}
      />
      {error && (
        <p className="mt-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
