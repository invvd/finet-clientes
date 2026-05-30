import Link from "next/link";

export default function HomePage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-6">
        <h1 className="text-2xl font-medium">Bienvenido a Finet</h1>
        <p className="text-[var(--color-muted)]">Hero pendiente - otro card del equipo.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/planes" className="border border-[var(--color-border)] px-3 py-2">
            Ver planes
          </Link>
          <Link href="/empresas" className="border border-[var(--color-border)] px-3 py-2">
            Servicios corporativos
          </Link>
        </div>
      </div>
    </section>
  );
}
