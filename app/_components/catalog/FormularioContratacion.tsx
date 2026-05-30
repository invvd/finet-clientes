import type { Plan } from "../../_data/planes";

type FormularioContratacionProps = {
  plan: Plan;
};

export default function FormularioContratacion({ plan }: FormularioContratacionProps) {
  return (
    <form className="grid max-w-xl gap-4 border border-[var(--color-border)] p-4">
      <input type="hidden" name="plan" value={plan.id} />
      <label className="grid gap-1">
        Nombre completo
        <input
          name="nombreCompleto"
          required
          placeholder="Nombre1 Nombre2 Ap1 Ap2"
          pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){1,3}"
          title="Nombre1 Nombre2 Ap1 Ap2. Respetar tildes. Máx 4 palabras visibles."
          className="border border-[var(--color-border)] p-2"
        />
      </label>
      <label className="grid gap-1">
        RUT
        <input
          name="rut"
          required
          placeholder="XX.XXX.XXX-X"
          pattern="[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9K]"
          title="XX.XXX.XXX-X"
          className="border border-[var(--color-border)] p-2"
        />
      </label>
      <label className="grid gap-1">
        Correo electrónico
        <input
          name="correoElectronico"
          type="email"
          required
          placeholder="usuario@dominio.cl"
          pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}"
          title="usuario@dominio.cl, siempre en minúsculas"
          className="border border-[var(--color-border)] p-2"
        />
      </label>
      <label className="grid gap-1">
        Teléfono móvil
        <input
          name="telefonoMovil"
          type="tel"
          required
          placeholder="+56 9 XXXX XXXX"
          pattern="\+56 9 [0-9]{4} [0-9]{4}"
          title="+56 9 XXXX XXXX"
          className="border border-[var(--color-border)] p-2"
        />
      </label>
      <fieldset className="grid gap-4 border border-[var(--color-border)] p-4">
        <legend className="px-1">Dirección de instalación</legend>
        <label className="grid gap-1">
          Calle + número
          <input
            name="calleNumero"
            required
            placeholder="Nombre Calle N°XXX"
            className="border border-[var(--color-border)] p-2"
          />
        </label>
        <label className="grid gap-1">
          Comuna
          <input
            name="comuna"
            required
            placeholder="Nombre oficial"
            title="Title Case. Usar catálogo oficial de comunas."
            className="border border-[var(--color-border)] p-2"
          />
        </label>
      </fieldset>
      <button type="submit" className="border border-[var(--color-border)] px-3 py-2">
        Enviar solicitud
      </button>
    </form>
  );
}
