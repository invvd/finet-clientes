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
        className="mb-1.5 block text-sm font-medium text-slate-300"
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
        className="w-full rounded-lg border bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors duration-200 focus:ring-2
          border-red-500/60 focus:border-red-400/60 focus:ring-red-400/20
          data-[error=false]:border-slate-700/60 data-[error=false]:focus:border-fin-400/60 data-[error=false]:focus:ring-fin-400/20"
      />
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
