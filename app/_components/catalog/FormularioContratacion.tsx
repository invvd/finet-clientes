"use client";

import { useState, type FormEvent } from "react";
import PrimaryButton from "../ui/PrimaryButton";
import type { Plan } from "../../_data/planes";

type FormularioContratacionProps = {
  plan: Plan;
};

type FormState = "idle" | "loading" | "success" | "error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function FormularioContratacion({ plan }: FormularioContratacionProps) {
  const [status, setStatus] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    try {
      const res = await fetch(`${API_URL}/contrataciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Error del servidor (${res.status})`);
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la solicitud. Intenta nuevamente."
      );
    }
  };

  if (status === "success") {
    return (
      <div className="grid max-w-xl gap-4 border border-[var(--color-primary)] bg-[var(--color-primary)]/10 p-6 rounded-lg" role="alert">
        <h2 className="text-lg font-medium text-[var(--color-foreground)]">
          Solicitud enviada
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Tu solicitud para <strong>{plan.nombre}</strong> ha sido recibida. Te
          contactaremos pronto al telefono y correo proporcionados.
        </p>
        <a
          href="/planes"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          &larr; Volver a planes
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid max-w-xl gap-4 border border-[var(--color-border)] p-6 rounded-lg"
    >
      <input type="hidden" name="plan" value={plan.id} />

      <label className="grid gap-1" htmlFor="nombreCompleto">
        Nombre completo
        <input
          id="nombreCompleto"
          name="nombreCompleto"
          required
          placeholder="Nombre1 Nombre2 Ap1 Ap2"
          pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){1,3}"
          title="Nombre1 Nombre2 Ap1 Ap2. Respetar tildes. Max 4 palabras visibles."
          className="border border-[var(--color-border)] bg-[var(--color-background)] p-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
        />
      </label>

      <label className="grid gap-1" htmlFor="rut">
        RUT
        <input
          id="rut"
          name="rut"
          required
          placeholder="XX.XXX.XXX-X"
          pattern="[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9K]"
          title="XX.XXX.XXX-X"
          className="border border-[var(--color-border)] bg-[var(--color-background)] p-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
        />
      </label>

      <label className="grid gap-1" htmlFor="correoElectronico">
        Correo electronico
        <input
          id="correoElectronico"
          name="correoElectronico"
          type="email"
          required
          placeholder="usuario@dominio.cl"
          pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}"
          title="usuario@dominio.cl, siempre en minusculas"
          className="border border-[var(--color-border)] bg-[var(--color-background)] p-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
        />
      </label>

      <label className="grid gap-1" htmlFor="telefonoMovil">
        Telefono movil
        <input
          id="telefonoMovil"
          name="telefonoMovil"
          type="tel"
          required
          placeholder="+56 9 XXXX XXXX"
          pattern="\+56 9 [0-9]{4} [0-9]{4}"
          title="+56 9 XXXX XXXX"
          className="border border-[var(--color-border)] bg-[var(--color-background)] p-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
        />
      </label>

      <fieldset className="grid gap-4 border border-[var(--color-border)] p-4 rounded-md">
        <legend className="px-1 text-sm">Direccion de instalacion</legend>

        <label className="grid gap-1" htmlFor="calleNumero">
          Calle + numero
          <input
            id="calleNumero"
            name="calleNumero"
            required
            placeholder="Nombre Calle N°XXX"
            className="border border-[var(--color-border)] bg-[var(--color-background)] p-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
          />
        </label>

        <label className="grid gap-1" htmlFor="comuna">
          Comuna
          <input
            id="comuna"
            name="comuna"
            required
            placeholder="Nombre oficial"
            title="Title Case. Usar catalogo oficial de comunas."
            className="border border-[var(--color-border)] bg-[var(--color-background)] p-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
          />
        </label>
      </fieldset>

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      <PrimaryButton
        type="submit"
        variant="solid"
        disabled={status === "loading"}
        className="w-full"
      >
        {status === "loading" ? "Enviando..." : "Enviar solicitud"}
      </PrimaryButton>
    </form>
  );
}
