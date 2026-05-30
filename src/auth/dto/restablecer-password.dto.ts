import { z } from 'zod';

export const restablecerPasswordSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
  password: z
    .string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(72)
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Contraseña debe contener al menos una mayúscula',
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'Contraseña debe contener al menos un número',
    }),
});

export type RestablecerPasswordDto = z.infer<typeof restablecerPasswordSchema>;
