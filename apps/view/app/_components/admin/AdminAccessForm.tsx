"use client";

import { useState } from "react";
import PrimaryButton from "@/app/_components/ui/PrimaryButton";

export default function AdminAccessForm({
  title,
  onSubmit,
}: {
  title: string;
  onSubmit: (apiKey: string) => void;
}) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="mx-auto max-w-md rounded-xl border border-border bg-background p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!key.trim()) {
          setError("Ingresa la clave interna.");
          return;
        }
        onSubmit(key.trim());
      }}
    >
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <label className="mt-5 block text-sm font-medium text-foreground">
        Clave interna
        <input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          autoComplete="off"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" className="mt-5 w-full">
        Entrar
      </PrimaryButton>
    </form>
  );
}
