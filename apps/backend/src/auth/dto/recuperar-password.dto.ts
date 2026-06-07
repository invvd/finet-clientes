import { z } from 'zod';
import { validateRut } from '../../common/utils/rut.js';

export const recuperarPasswordSchema = z.object({
  rut: z
    .string()
    .min(1, 'RUT es requerido')
    .refine((val) => /^\d{1,8}[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 123456785',
    })
    .refine((val) => validateRut(val), {
      message: 'RUT inválido — dígito verificador incorrecto',
    }),
});

export type RecuperarPasswordDto = z.infer<typeof recuperarPasswordSchema>;
