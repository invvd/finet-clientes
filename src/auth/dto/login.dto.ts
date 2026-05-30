import { z } from 'zod';
import { validateRut } from '../../common/utils/rut.js';

export const loginSchema = z.object({
  rut: z
    .string()
    .min(1, 'RUT es requerido')
    .refine((val) => /^\d{1,3}(\.\d{3})*-[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 12.345.678-5',
    })
    .refine((val) => validateRut(val), {
      message: 'RUT inválido — dígito verificador incorrecto',
    }),
  password: z.string().min(1, 'Contraseña es requerida'),
});

export type LoginDto = z.infer<typeof loginSchema>;
