import { getServiciosCorporativos } from "../data/serviciosCorporativos";

export default function EmpresasPage() {
  const servicios = getServiciosCorporativos();

  return (
    <main className="grid gap-6 p-6">
      <h1 className="text-2xl font-semibold">Ofertas y servicios corporativos</h1>
      {servicios.length > 0 ? (
        <section className="grid gap-4">
          {servicios.map((servicio) => (
            <article key={servicio.id} className="border p-4">
              <h2 className="text-xl font-semibold">{servicio.nombre}</h2>
              <p>{servicio.descripcion}</p>
            </article>
          ))}
        </section>
      ) : (
        <p>El contenido corporativo no esta disponible temporalmente.</p>
      )}
    </main>
  );
}
