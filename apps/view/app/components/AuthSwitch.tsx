"use client";

type AuthSwitchProps = {
  active: "login" | "register";
  onChange: (mode: "login" | "register") => void;
};

export default function AuthSwitch({ active, onChange }: AuthSwitchProps) {
  return (
    <div className="mb-8 flex w-full rounded-lg bg-border p-1">
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "login"
            ? "bg-primary text-background shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Iniciar Sesión
      </button>
      <button
        type="button"
        onClick={() => onChange("register")}
        className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "register"
            ? "bg-primary text-background shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Registrarse
      </button>
    </div>
  );
}
