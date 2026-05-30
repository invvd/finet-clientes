import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="grid gap-4 p-6">
      <h1 className="text-2xl font-semibold">Pagina no encontrada</h1>
      <p>La ruta solicitada no esta disponible.</p>
      <Link href="/planes" className="border px-3 py-2">
        Volver a planes
      </Link>
    </main>
  );
}
