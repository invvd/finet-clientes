import { z } from 'zod';

export const desbloquearIpSchema = z.object({
  ip: z
    .string()
    .min(1, 'IP es requerida')
    .refine((val) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val) || val.includes(':'), {
      message: 'Formato de IP inválido',
    }),
});

export type DesbloquearIpDto = z.infer<typeof desbloquearIpSchema>;
