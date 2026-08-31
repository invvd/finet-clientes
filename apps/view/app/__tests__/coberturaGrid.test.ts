import {
  PASO_GRILLA_FINA,
  celdasBajoPincel,
  claveCelda,
  colorDensidad,
  snapCoordenada,
} from '@/app/_lib/cobertura-grid';

/**
 * Este archivo espeja `apps/controller/src/cobertura/cobertura-grid.spec.ts`.
 * Si el redondeo del backend cambia, estos tests son los que avisan que el
 * editor quedó desincronizado con lo que se guarda.
 */
describe('snapCoordenada (debe coincidir con el backend)', () => {
  it('lleva la coordenada al centro de su celda', () => {
    expect(snapCoordenada(-33.60013, PASO_GRILLA_FINA)).toBe(-33.6);
    expect(snapCoordenada(-33.60031, PASO_GRILLA_FINA)).toBe(-33.6005);
  });

  it('recorta a 6 decimales, como la columna Decimal(9,6)', () => {
    const valor = snapCoordenada(-70.61027, PASO_GRILLA_FINA);
    const decimales = String(valor).split('.')[1]?.length ?? 0;
    expect(decimales).toBeLessThanOrEqual(6);
  });

  it('es idempotente', () => {
    const una = snapCoordenada(-70.61237, PASO_GRILLA_FINA);
    expect(snapCoordenada(una, PASO_GRILLA_FINA)).toBe(una);
  });
});

describe('celdasBajoPincel', () => {
  it('con radio 0 devuelve solo la celda del centro', () => {
    const celdas = celdasBajoPincel(-33.60013, -70.61027, PASO_GRILLA_FINA, 0);
    expect(celdas).toEqual([{ latitud: -33.6, longitud: -70.6105 }]);
  });

  it('el pincel es redondo, no cuadrado', () => {
    const radio = 3;
    const celdas = celdasBajoPincel(-33.6, -70.61, PASO_GRILLA_FINA, radio);
    const lado = radio * 2 + 1;
    expect(celdas.length).toBeLessThan(lado * lado);
    expect(celdas.length).toBeGreaterThan(0);
  });

  it('todas las celdas quedan alineadas a la grilla', () => {
    const celdas = celdasBajoPincel(-33.60037, -70.61042, PASO_GRILLA_FINA, 4);
    for (const celda of celdas) {
      expect(snapCoordenada(celda.latitud, PASO_GRILLA_FINA)).toBe(celda.latitud);
      expect(snapCoordenada(celda.longitud, PASO_GRILLA_FINA)).toBe(celda.longitud);
    }
  });

  it('no repite celdas dentro de una misma pasada', () => {
    const celdas = celdasBajoPincel(-33.6, -70.61, PASO_GRILLA_FINA, 5);
    const claves = new Set(celdas.map((c) => claveCelda(c.latitud, c.longitud)));
    expect(claves.size).toBe(celdas.length);
  });

  it('un radio mayor cubre mas celdas', () => {
    const chico = celdasBajoPincel(-33.6, -70.61, PASO_GRILLA_FINA, 2);
    const grande = celdasBajoPincel(-33.6, -70.61, PASO_GRILLA_FINA, 6);
    expect(grande.length).toBeGreaterThan(chico.length);
  });
});

describe('colorDensidad', () => {
  it('va de naranjo (poca cobertura) a verde azulado (mucha)', () => {
    const tono = (css: string) => Number(css.match(/hsl\((\d+(?:\.\d+)?)/)![1]);
    expect(tono(colorDensidad(0))).toBeLessThan(tono(colorDensidad(100)));
  });

  it('acota valores fuera de rango en vez de salirse de la escala', () => {
    expect(colorDensidad(-50)).toBe(colorDensidad(0));
    expect(colorDensidad(500)).toBe(colorDensidad(100));
  });
});
