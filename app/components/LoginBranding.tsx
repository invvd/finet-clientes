export default function LoginBranding({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-fin-400 to-fin-600 text-xl font-bold text-white shadow-lg shadow-fin-500/25">
        F
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Finet</h1>
      <p className="mt-1 text-sm text-slate-400">
        {subtitle ?? "Ingresa con tu RUT y contraseña"}
      </p>
    </div>
  );
}
