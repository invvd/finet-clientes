import { describe, expect, it } from '@jest/globals';
import { actualizarTicketSchema, tecnicoQuerySchema } from './soporte.dto.js';

describe('DTO de soporte', () => {
  it('convierte el id de tecnico recibido por query', () => {
    const result = tecnicoQuerySchema.safeParse({ id_usuario: '7' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id_usuario).toBe(7);
  });

  it('impide cerrar sin detalle de resolucion', () => {
    const result = actualizarTicketSchema.safeParse({
      id_usuario: 7,
      estado: 'cerrado',
      accion: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza estados no admitidos', () => {
    const result = actualizarTicketSchema.safeParse({
      id_usuario: 7,
      estado: 'eliminado',
      accion: 'Intento invalido',
    });
    expect(result.success).toBe(false);
  });
});
