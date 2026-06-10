"use client";

function formatTelefono(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
}

export default function TelefonoInput({
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
        htmlFor="telefono"
        className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
      >
        Teléfono
      </label>
      <input
        id="telefono"
        type="tel"
        inputMode="numeric"
        placeholder="+56912345678"
        maxLength={12}
        value={value}
        onChange={(e) => onChange(formatTelefono(e.target.value))}
        onBlur={onBlur}
        data-error={!!error}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200
          data-[error=false]:border-[var(--color-border)] data-[error=false]:bg-[var(--color-background)] data-[error=false]:text-[var(--color-foreground)] data-[error=false]:placeholder:text-[var(--color-muted)] data-[error=false]:focus-visible:outline data-[error=false]:focus-visible:outline-2 data-[error=false]:focus-visible:outline-offset-0 data-[error=false]:focus-visible:outline-[var(--color-primary)]
          border-red-500 bg-red-50 text-[var(--color-foreground)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-red-500`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
