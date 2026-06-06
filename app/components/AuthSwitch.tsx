"use client";

type AuthSwitchProps = {
  active: "login" | "register";
  onChange: (mode: "login" | "register") => void;
};

export default function AuthSwitch({ active, onChange }: AuthSwitchProps) {
  return (
    <div className="mb-8 flex w-full rounded-full bg-[var(--color-border)] p-1">
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "login"
            ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm"
            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        }`}
      >
        Iniciar Sesión
      </button>
      <button
        type="button"
        onClick={() => onChange("register")}
        className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "register"
            ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm"
            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        }`}
      >
        Registrarse
      </button>
    </div>
  );
}
