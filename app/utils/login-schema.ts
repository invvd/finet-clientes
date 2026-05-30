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

export const loginSchema = z.object({
  rut: z
    .string({ message: "El RUT es obligatorio" })
    .min(1, "El RUT es obligatorio")
    .refine((val) => validateRut(val), "RUT inválido"),
  password: z
    .string({ message: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;
