import Logo from "./components/Logo";
import NavMenu from "./components/NavMenu";
import PrimaryButton from "./components/PrimaryButton";

const SECCIONES = [
  { title: "Inicio", link: "/" },
  { title: "Planes", link: "/planes" },
  { title: "Contacto", link: "/contacto" },
  { title: "Nosotros", link: "/nosotros" },
  { title: "Empresas", link: "/empresas" },
];

export default function InicioPage() {
  return (
    <div>
      <nav>
        {/* Logo */}
        <Logo />
        {/* Secciones */}
        <ul>
          {SECCIONES.map((seccion) => (
            <li key={seccion.link}>
              <a href={seccion.link}>{seccion.title}</a>
            </li>
          ))}
        </ul>
        {/* Menu Movil Colapsable */}
        <NavMenu sections={SECCIONES} />
        {/* Boton de Perfil del Cliente */}
        <PrimaryButton text="" link="" />
        {/* Alternador de Modo Claro/Oscuro */}
      </nav>
      <main className="grid gap-4 p-6">
        <h1 className="text-2xl font-semibold">Finet clientes</h1>
        <p>Portal publico para consultar planes, empresas y solicitar contratacion.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/planes" className="border px-3 py-2">
            Ver planes
          </a>
          <a href="/empresas" className="border px-3 py-2">
            Servicios corporativos
          </a>
        </div>
      </main>
      <footer>
        {/* Redes Sociales */}
        {/* Direccion */}
      </footer>
    </div>
  );
}
