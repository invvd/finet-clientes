import Image from "next/image";

export default function LoginBranding({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <Image
        src="/brand/FinetLogo.webp"
        alt="Finet — Internet y TV"
        width={120}
        height={40}
        priority
        className="mx-auto h-10 w-auto"
      />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
        Portal de Clientes
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {subtitle ?? "Ingresa con tu RUT y contraseña"}
      </p>
    </div>
  );
}
