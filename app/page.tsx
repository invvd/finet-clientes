import Logo from "./components/Logo";
import PrimaryButton from "./components/PrimaryButton";

const SECCIONES = [
  { title: "Inicio", link: "/" },
  { title: "Planes", link: "/planes" },
  { title: "Contacto", link: "/contacto" },
  { title: "Nosotros", link: "/nosotros" },
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
        {/* Boton de Perfil del Cliente */}
        <PrimaryButton text="" link="" />
        {/* Alternador de Modo Claro/Oscuro */}
      </nav>
      <footer>
        {/* Redes Sociales */}
        {/* Direccion */}
      </footer>
    </div>
  );
}
