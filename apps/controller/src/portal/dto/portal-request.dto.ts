import { z } from 'zod';

// ─── CU-31/CU-32: Cambiar contraseña de red WiFi ─────────────────────────
export const CambiarWifiPasswordDto = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(63, 'Máximo 63 caracteres')
    .regex(/^\S+$/),
});
export type CambiarWifiPasswordDto = z.infer<typeof CambiarWifiPasswordDto>;