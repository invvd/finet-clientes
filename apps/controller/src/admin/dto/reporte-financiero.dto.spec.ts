import { describe, expect, it } from '@jest/globals';
import { reporteFinancieroQuerySchema } from './reporte-financiero.dto.js';

describe('reporteFinancieroQuerySchema', () => {
  it('acepta un rango valido', () => {
    expect(
      reporteFinancieroQuerySchema.safeParse({
        desde: '2026-08-01',
        hasta: '2026-08-31',
      }).success,
    ).toBe(true);
  });

  it('rechaza un rango invertido', () => {
    expect(
      reporteFinancieroQuerySchema.safeParse({
        desde: '2026-09-01',
        hasta: '2026-08-31',
      }).success,
    ).toBe(false);
  });

  it('rechaza fechas inexistentes', () => {
    expect(
      reporteFinancieroQuerySchema.safeParse({
        desde: '2026-02-30',
        hasta: '2026-03-01',
      }).success,
    ).toBe(false);
  });
});
