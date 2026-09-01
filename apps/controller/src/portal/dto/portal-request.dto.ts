import { z } from 'zod';

// ─── CU-31/CU-32: Cambiar contraseña de red WiFi ─────────────────────────
export const CambiarWifiPasswordDto = z
  .object({
    id_contrato: z.number().int().positive('Debe seleccionar un servicio'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(63, 'Máximo 63 caracteres')
      .regex(/^\S+$/, 'No se permiten espacios'),
    password_confirmacion: z
      .string()
      .min(1, 'Debe confirmar la nueva contraseña'),
  })
  .refine((data) => data.password === data.password_confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmacion'],
  });
export type CambiarWifiPasswordDto = z.infer<typeof CambiarWifiPasswordDto>;