import { z } from 'zod';

export const intentosFallidosQuerySchema = z.object({
  rut: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{1,8}[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 123456785',
    }),
  ip: z.string().optional(),
  bloqueados: z.enum(['true', 'false']).optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type IntentosFallidosQueryDto = z.infer<
  typeof intentosFallidosQuerySchema
>;
