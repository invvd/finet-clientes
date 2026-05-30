import { z } from "zod";

function validateRut(rut: string) {
  const cleaned = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleaned.length < 3) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedDv =
    remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return expectedDv === dv;
}

function validateTelefonoChileno(telefono: string) {
  const cleaned = telefono.replace(/\s/g, "");
  if (!/^\+56\d{9}$/.test(cleaned)) return false;
  const digits = cleaned.slice(3);
  const first = digits[0];
  if (first === "9") return /^9[5-9]\d{7}$/.test(digits);
  if (["2", "3", "4", "5", "6", "7", "8"].includes(first)) return true;
  return false;
}

export const loginSchema = z.object({
  rut: z
    .string({ message: "El RUT es obligatorio" })
    .min(1, "El RUT es obligatorio")
    .refine((val) => validateRut(val), "RUT inválido"),
  password: z
    .string({ message: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z
  .object({
    nombre: z
      .string({ message: "El nombre es obligatorio" })
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre es demasiado largo"),
    email: z
      .string({ message: "El email es obligatorio" })
      .min(1, "El email es obligatorio")
      .email("Email inválido"),
    telefono: z
      .string({ message: "El teléfono es obligatorio" })
      .min(1, "El teléfono es obligatorio")
      .refine((val) => validateTelefonoChileno(val), "Teléfono chileno inválido"),
    rut: z
      .string({ message: "El RUT es obligatorio" })
      .min(1, "El RUT es obligatorio")
      .refine((val) => validateRut(val), "RUT inválido"),
    password: z
      .string({ message: "La contraseña es obligatoria" })
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(128, "La contraseña es demasiado larga"),
    confirmPassword: z
      .string({ message: "Debes confirmar la contraseña" })
      .min(1, "Debes confirmar la contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
