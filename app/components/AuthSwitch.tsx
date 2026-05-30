"use client";

type AuthSwitchProps = {
  active: "login" | "register";
  onChange: (mode: "login" | "register") => void;
};

export default function AuthSwitch({ active, onChange }: AuthSwitchProps) {
  return (
    <div className="mb-8 flex w-full rounded-full bg-surface-50/80 p-1 ring-1 ring-slate-700/50">
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "login"
            ? "bg-fin-500 text-white shadow-md shadow-fin-500/25"
            : "text-slate-400 hover:text-slate-300"
        }`}
      >
        Iniciar Sesión
      </button>
      <button
        type="button"
        onClick={() => onChange("register")}
        className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "register"
            ? "bg-fin-500 text-white shadow-md shadow-fin-500/25"
            : "text-slate-400 hover:text-slate-300"
        }`}
      >
        Registrarse
      </button>
    </div>
  );
}
