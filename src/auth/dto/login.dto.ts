import { z } from 'zod';
import { validateRut } from '../../common/utils/rut.js';

export const loginSchema = z.object({
  rut: z
    .string()
    .min(1, 'RUT es requerido')
    .refine((val) => /^\d{1,8}[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 123456785',
    })
    .refine((val) => validateRut(val), {
      message: 'RUT inválido — dígito verificador incorrecto',
    }),
  password: z.string().min(1, 'Contraseña es requerida'),
});

export type LoginDto = z.infer<typeof loginSchema>;
