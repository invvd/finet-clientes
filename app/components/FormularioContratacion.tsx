import type { Plan } from "../data/planes";

type FormularioContratacionProps = {
  plan: Plan;
};

export default function FormularioContratacion({ plan }: FormularioContratacionProps) {
  return (
    <form className="grid max-w-xl gap-4 border p-4">
      <input type="hidden" name="plan" value={plan.id} />
      <label className="grid gap-1">
        Nombre completo
        <input name="nombre" required className="border p-2" />
      </label>
      <label className="grid gap-1">
        Correo electronico
        <input name="correo" type="email" required className="border p-2" />
      </label>
      <label className="grid gap-1">
        Telefono
        <input name="telefono" type="tel" required className="border p-2" />
      </label>
      <label className="grid gap-1">
        Direccion de instalacion
        <input name="direccion" required className="border p-2" />
      </label>
      <button type="submit" className="border px-3 py-2">
        Enviar solicitud
      </button>
    </form>
  );
}
