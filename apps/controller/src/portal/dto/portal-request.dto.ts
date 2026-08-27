import { z } from 'zod';

// ─── CU-31/CU-32: Cambiar contraseña de red WiFi ─────────────────────────
// RF-24: solo caracteres alfanuméricos
export const CambiarWifiPasswordDto = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(63, 'Máximo 63 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo se permiten letras y números'),
});
export type CambiarWifiPasswordDto = z.infer<typeof CambiarWifiPasswordDto>;