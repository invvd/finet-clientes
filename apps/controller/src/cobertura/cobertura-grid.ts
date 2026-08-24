/**
 * Grilla del editor de cobertura (CU-59 / CU-60).
 *
 * El editor trabaja con dos resoluciones distintas:
 *
 * - **Fina** (`PASO_GRILLA_FINA`) — la que pinta el pincel y se guarda en
 *   `punto_cobertura`. Cada fila de esa tabla es una celda de esta grilla, y el
 *   indice unico `uq_punto_cobertura_celda` depende de que las coordenadas
 *   lleguen siempre redondeadas con `snapCoordenada`.
 * - **Publica** (`PASO_GRILLA_PUBLICA`) — la que sale por la API del mapa
 *   publico. Mas gruesa a proposito: `leaflet.heat` se degrada pasando los
 *   ~15.000 puntos, y a esta escala el heatmap ya se ve igual porque el propio
 *   render aplica un blur de 20 px.
 *
 * Ver docs/db/2026-08-23-editor-cobertura.md para el porque del modelo.
 */

/** ~55 m en latitud a la altura de Santiago (-33.6). */
export const PASO_GRILLA_FINA = 0.0005;

/** ~220 m: cuatro celdas finas por lado. */
export const PASO_GRILLA_PUBLICA = 0.002;

export interface Celda {
  latitud: number;
  longitud: number;
  densidad: number;
  tipo: string | null;
}

export type Vertice = [number, number];

export interface ZonaRasterizable {
  vertices: Vertice[];
  densidad: number;
  tipo: string | null;
}

/**
 * Redondea una coordenada al centro de su celda.
 *
 * El `toFixed(6)` no es cosmetico: `Math.round(v / paso) * paso` arrastra error
 * de punto flotante (-33.60000000000001) y la columna es `Decimal(9,6)`, asi que
 * sin recortar a 6 decimales dos pinceladas sobre la misma celda podrian
 * guardarse como coordenadas distintas y esquivar el indice unico.
 */
export function snapCoordenada(valor: number, paso: number): number {
  return Number((Math.round(valor / paso) * paso).toFixed(6));
}

/** Clave estable de una celda, para deduplicar en memoria. */
export function claveCelda(latitud: number, longitud: number): string {
  return `${latitud}|${longitud}`;
}

/**
 * Ray casting: cuenta cuantas veces un rayo horizontal hacia el este cruza los
 * lados del poligono. Impar = adentro.
 *
 * El anillo viene sin cerrar (el ultimo vertice conecta con el primero), por eso
 * el indice `j` arranca en `length - 1`.
 */
export function puntoEnPoligono(
  latitud: number,
  longitud: number,
  vertices: Vertice[],
): boolean {
  let dentro = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [latI, lngI] = vertices[i];
    const [latJ, lngJ] = vertices[j];

    const cruzaEnLatitud = latI > latitud !== latJ > latitud;
    if (!cruzaEnLatitud) continue;

    const lngInterseccion =
      ((lngJ - lngI) * (latitud - latI)) / (latJ - latI) + lngI;

    if (longitud < lngInterseccion) dentro = !dentro;
  }

  return dentro;
}

/** Caja envolvente de un anillo, ya redondeada a la grilla. */
function limitesDeZona(vertices: Vertice[], paso: number) {
  let latMin = Infinity;
  let latMax = -Infinity;
  let lngMin = Infinity;
  let lngMax = -Infinity;

  for (const [lat, lng] of vertices) {
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
    if (lng < lngMin) lngMin = lng;
    if (lng > lngMax) lngMax = lng;
  }

  return {
    latMin: snapCoordenada(latMin, paso),
    latMax: snapCoordenada(latMax, paso),
    lngMin: snapCoordenada(lngMin, paso),
    lngMax: snapCoordenada(lngMax, paso),
  };
}

/**
 * Convierte los poligonos en celdas de grilla.
 *
 * Solo recorre la caja envolvente de cada zona, no el mapa entero. Cuando dos
 * zonas se solapan gana la de mayor densidad: el area queda representada por su
 * mejor cobertura, no por la ultima que se dibujo.
 */
export function rasterizarZonas(
  zonas: ZonaRasterizable[],
  paso: number,
): Map<string, Celda> {
  const celdas = new Map<string, Celda>();

  for (const zona of zonas) {
    if (zona.vertices.length < 3) continue;

    const { latMin, latMax, lngMin, lngMax } = limitesDeZona(
      zona.vertices,
      paso,
    );

    for (let lat = latMin; lat <= latMax; lat += paso) {
      const latCelda = snapCoordenada(lat, paso);

      for (let lng = lngMin; lng <= lngMax; lng += paso) {
        const lngCelda = snapCoordenada(lng, paso);

        if (!puntoEnPoligono(latCelda, lngCelda, zona.vertices)) continue;

        const clave = claveCelda(latCelda, lngCelda);
        const previa = celdas.get(clave);

        if (!previa || zona.densidad > previa.densidad) {
          celdas.set(clave, {
            latitud: latCelda,
            longitud: lngCelda,
            densidad: zona.densidad,
            tipo: zona.tipo,
          });
        }
      }
    }
  }

  return celdas;
}

/**
 * Baja las celdas del pincel (grilla fina) a la grilla publica.
 * Se queda con la densidad maxima de cada grupo: una zona con cobertura buena
 * no debe diluirse por promediar contra sus bordes.
 */
export function agregarAGrillaPublica(
  puntos: Celda[],
  paso: number,
): Map<string, Celda> {
  const celdas = new Map<string, Celda>();

  for (const punto of puntos) {
    const latCelda = snapCoordenada(punto.latitud, paso);
    const lngCelda = snapCoordenada(punto.longitud, paso);
    const clave = claveCelda(latCelda, lngCelda);
    const previa = celdas.get(clave);

    if (!previa || punto.densidad > previa.densidad) {
      celdas.set(clave, {
        latitud: latCelda,
        longitud: lngCelda,
        densidad: punto.densidad,
        tipo: punto.tipo,
      });
    }
  }

  return celdas;
}

/**
 * Combina las dos capas para el mapa publico.
 * **El pincel siempre gana sobre el poligono**: el poligono es el relleno base y
 * el pincel el retoque manual encima, asi que borrar o bajar una celda a mano
 * tiene que verse aunque haya un poligono cubriendola.
 */
export function combinarCapas(
  zonasRasterizadas: Map<string, Celda>,
  pincelAgregado: Map<string, Celda>,
): Celda[] {
  const combinado = new Map(zonasRasterizadas);

  for (const [clave, celda] of pincelAgregado) {
    combinado.set(clave, celda);
  }

  return [...combinado.values()];
}
