export default function LoginBranding({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-xl font-bold text-[var(--color-background)] shadow-sm">
        F
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
        Finet
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {subtitle ?? "Ingresa con tu RUT y contraseña"}
      </p>
    </div>
  );
}
