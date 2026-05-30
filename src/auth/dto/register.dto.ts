import { z } from 'zod';
import { validateRut } from '../../common/utils/rut.js';

export const registerSchema = z.object({
  rut: z
    .string()
    .min(1, 'RUT es requerido')
    .refine((val) => /^\d{1,3}(\.\d{3})*-[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 12.345.678-5',
    })
    .refine((val) => validateRut(val), {
      message: 'RUT inválido — dígito verificador incorrecto',
    }),
  nombre_completo: z
    .string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(120),
  email: z
    .string()
    .email('Email inválido')
    .max(120)
    .optional()
    .or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  password: z
    .string()
    .min(6, 'Contraseña debe tener al menos 6 caracteres')
    .max(72),
});

export type RegisterDto = z.infer<typeof registerSchema>;
