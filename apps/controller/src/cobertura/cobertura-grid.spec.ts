import { describe, it, expect } from '@jest/globals';
import {
  PASO_GRILLA_FINA,
  PASO_GRILLA_PUBLICA,
  agregarAGrillaPublica,
  claveCelda,
  combinarCapas,
  puntoEnPoligono,
  rasterizarZonas,
  snapCoordenada,
} from './cobertura-grid.js';
import type { Vertice } from './cobertura-grid.js';

/** Cuadrado de 0.02° de lado sobre La Pintana. */
const CUADRADO: Vertice[] = [
  [-33.57, -70.645],
  [-33.57, -70.625],
  [-33.59, -70.625],
  [-33.59, -70.645],
];

describe('snapCoordenada', () => {
  it('lleva la coordenada al centro de su celda', () => {
    expect(snapCoordenada(-33.60013, PASO_GRILLA_FINA)).toBe(-33.6);
    expect(snapCoordenada(-33.60031, PASO_GRILLA_FINA)).toBe(-33.6005);
  });

  it('no arrastra error de punto flotante mas alla de 6 decimales', () => {
    // Sin el toFixed(6), esta cuenta da -33.60000000000001 y la celda se
    // duplicaria en la base pese al indice unico.
    const valor = snapCoordenada(-33.6001, PASO_GRILLA_FINA);
    expect(
      String(valor).replace('-', '').split('.')[1]?.length ?? 0,
    ).toBeLessThanOrEqual(6);
  });

  it('es idempotente: redondear dos veces da lo mismo', () => {
    const una = snapCoordenada(-70.61237, PASO_GRILLA_FINA);
    expect(snapCoordenada(una, PASO_GRILLA_FINA)).toBe(una);
  });

  it('la grilla publica es mas gruesa que la fina', () => {
    expect(PASO_GRILLA_PUBLICA).toBeGreaterThan(PASO_GRILLA_FINA);
  });
});

describe('puntoEnPoligono', () => {
  it('detecta un punto interior', () => {
    expect(puntoEnPoligono(-33.58, -70.635, CUADRADO)).toBe(true);
  });

  it('descarta un punto exterior', () => {
    expect(puntoEnPoligono(-33.55, -70.635, CUADRADO)).toBe(false);
    expect(puntoEnPoligono(-33.58, -70.7, CUADRADO)).toBe(false);
  });

  it('cierra el anillo aunque el ultimo vertice no repita al primero', () => {
    // El lado que va del ultimo vertice al primero es el borde oeste; un punto
    // apenas al este de el tiene que quedar adentro.
    expect(puntoEnPoligono(-33.58, -70.6449, CUADRADO)).toBe(true);
  });

  it('maneja un poligono concavo (forma de L)', () => {
    const ele: Vertice[] = [
      [-33.57, -70.65],
      [-33.57, -70.63],
      [-33.58, -70.63],
      [-33.58, -70.64],
      [-33.59, -70.64],
      [-33.59, -70.65],
    ];
    expect(puntoEnPoligono(-33.575, -70.635, ele)).toBe(true);
    // Hueco de la L.
    expect(puntoEnPoligono(-33.585, -70.635, ele)).toBe(false);
  });
});

describe('rasterizarZonas', () => {
  it('convierte un poligono en celdas de grilla con su densidad', () => {
    const celdas = rasterizarZonas(
      [{ vertices: CUADRADO, densidad: 80, tipo: 'fibra' }],
      PASO_GRILLA_PUBLICA,
    );

    expect(celdas.size).toBeGreaterThan(0);
    for (const celda of celdas.values()) {
      expect(celda.densidad).toBe(80);
      expect(celda.tipo).toBe('fibra');
      expect(puntoEnPoligono(celda.latitud, celda.longitud, CUADRADO)).toBe(
        true,
      );
    }
  });

  it('ignora poligonos con menos de 3 vertices', () => {
    const celdas = rasterizarZonas(
      [{ vertices: [[-33.5, -70.6]] as Vertice[], densidad: 50, tipo: null }],
      PASO_GRILLA_PUBLICA,
    );
    expect(celdas.size).toBe(0);
  });

  it('al solaparse dos zonas gana la de mayor densidad', () => {
    const celdas = rasterizarZonas(
      [
        { vertices: CUADRADO, densidad: 90, tipo: 'fibra' },
        { vertices: CUADRADO, densidad: 30, tipo: 'parcial' },
      ],
      PASO_GRILLA_PUBLICA,
    );

    for (const celda of celdas.values()) {
      expect(celda.densidad).toBe(90);
    }
  });

  it('el orden de las zonas no cambia el resultado', () => {
    const zonaA = { vertices: CUADRADO, densidad: 90, tipo: 'fibra' };
    const zonaB = { vertices: CUADRADO, densidad: 30, tipo: 'parcial' };

    const unOrden = rasterizarZonas([zonaA, zonaB], PASO_GRILLA_PUBLICA);
    const otroOrden = rasterizarZonas([zonaB, zonaA], PASO_GRILLA_PUBLICA);

    expect([...unOrden.values()]).toEqual([...otroOrden.values()]);
  });

  it('una grilla mas gruesa produce menos celdas', () => {
    const finas = rasterizarZonas(
      [{ vertices: CUADRADO, densidad: 50, tipo: null }],
      PASO_GRILLA_FINA,
    );
    const gruesas = rasterizarZonas(
      [{ vertices: CUADRADO, densidad: 50, tipo: null }],
      PASO_GRILLA_PUBLICA,
    );

    expect(gruesas.size).toBeLessThan(finas.size);
  });
});

describe('agregarAGrillaPublica', () => {
  it('junta celdas finas vecinas en una sola celda gruesa', () => {
    const agregadas = agregarAGrillaPublica(
      [
        { latitud: -33.6, longitud: -70.61, densidad: 40, tipo: 'fibra' },
        { latitud: -33.6005, longitud: -70.6105, densidad: 90, tipo: 'fibra' },
      ],
      PASO_GRILLA_PUBLICA,
    );

    expect(agregadas.size).toBe(1);
  });

  it('se queda con la densidad maxima, no con el promedio', () => {
    const agregadas = agregarAGrillaPublica(
      [
        { latitud: -33.6, longitud: -70.61, densidad: 40, tipo: 'fibra' },
        { latitud: -33.6005, longitud: -70.6105, densidad: 90, tipo: 'fibra' },
      ],
      PASO_GRILLA_PUBLICA,
    );

    expect([...agregadas.values()][0].densidad).toBe(90);
  });
});

describe('combinarCapas', () => {
  const clave = claveCelda(-33.6, -70.61);

  it('el pincel pisa al poligono en la misma celda', () => {
    const zonas = new Map([
      [
        clave,
        { latitud: -33.6, longitud: -70.61, densidad: 80, tipo: 'fibra' },
      ],
    ]);
    const pincel = new Map([
      [
        clave,
        { latitud: -33.6, longitud: -70.61, densidad: 10, tipo: 'parcial' },
      ],
    ]);

    const resultado = combinarCapas(zonas, pincel);

    expect(resultado).toHaveLength(1);
    // 10 aunque sea menor que 80: bajar una celda a mano tiene que verse.
    expect(resultado[0].densidad).toBe(10);
  });

  it('conserva las celdas que solo aporta una de las dos capas', () => {
    const zonas = new Map([
      [
        clave,
        { latitud: -33.6, longitud: -70.61, densidad: 80, tipo: 'fibra' },
      ],
    ]);
    const otraClave = claveCelda(-33.58, -70.63);
    const pincel = new Map([
      [
        otraClave,
        { latitud: -33.58, longitud: -70.63, densidad: 55, tipo: null },
      ],
    ]);

    expect(combinarCapas(zonas, pincel)).toHaveLength(2);
  });

  it('no muta los mapas de entrada', () => {
    const zonas = new Map([
      [
        clave,
        { latitud: -33.6, longitud: -70.61, densidad: 80, tipo: 'fibra' },
      ],
    ]);
    const pincel = new Map([
      [
        claveCelda(-33.58, -70.63),
        { latitud: -33.58, longitud: -70.63, densidad: 55, tipo: null },
      ],
    ]);

    combinarCapas(zonas, pincel);

    expect(zonas.size).toBe(1);
    expect(pincel.size).toBe(1);
  });
});
