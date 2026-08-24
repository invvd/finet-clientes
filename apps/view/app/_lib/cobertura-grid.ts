/**
 * Grilla del editor de cobertura, lado cliente.
 *
 * ⚠️ Espeja `apps/controller/src/cobertura/cobertura-grid.ts`. El backend vuelve
 * a redondear todo lo que recibe, asi que una diferencia no corrompe datos —
 * pero si las dos versiones se desincronizan, el editor dibuja una celda en un
 * lugar y el backend la guarda en otro. Si cambia el paso o el redondeo alla,
 * cambiarlo aca tambien.
 */

/** Se recibe del backend en `GET /admin/cobertura/lienzo`; esto es el fallback. */
export const PASO_GRILLA_FINA = 0.0005;

/** Metros aproximados por paso de grilla en latitud, a la altura de Santiago. */
export const METROS_POR_PASO = 55;

export type Celda = {
  latitud: number;
  longitud: number;
  densidad: number;
};

/** Mismo redondeo que el backend, incluido el recorte a 6 decimales. */
export function snapCoordenada(valor: number, paso: number): number {
  return Number((Math.round(valor / paso) * paso).toFixed(6));
}

export function claveCelda(latitud: number, longitud: number): string {
  return `${latitud}|${longitud}`;
}

/**
 * Celdas que cubre el pincel centrado en un punto.
 * `radio` va en celdas, no en metros: mantiene el pincel predecible al hacer
 * zoom y evita tener que convertir grados a metros en cada movimiento.
 */
export function celdasBajoPincel(
  latitud: number,
  longitud: number,
  paso: number,
  radio: number
): { latitud: number; longitud: number }[] {
  const latCentro = snapCoordenada(latitud, paso);
  const lngCentro = snapCoordenada(longitud, paso);
  const celdas: { latitud: number; longitud: number }[] = [];
  const radioCuadrado = radio * radio;

  for (let i = -radio; i <= radio; i++) {
    for (let j = -radio; j <= radio; j++) {
      if (i * i + j * j > radioCuadrado) continue;
      celdas.push({
        latitud: snapCoordenada(latCentro + i * paso, paso),
        longitud: snapCoordenada(lngCentro + j * paso, paso),
      });
    }
  }

  return celdas;
}

/**
 * Color de una celda segun su densidad: naranjo (cobertura baja) a verde
 * azulado (cobertura alta). Se calcula en HSL en vez de usar los tokens del
 * sistema de diseno porque es un degrade continuo, no una escala de estados.
 */
export function colorDensidad(densidad: number, alfa = 0.65): string {
  const acotada = Math.max(0, Math.min(100, densidad));
  const tono = 15 + (acotada / 100) * 150; // 15 = naranjo, 165 = verde azulado
  return `hsl(${tono} 85% 48% / ${alfa})`;
}
