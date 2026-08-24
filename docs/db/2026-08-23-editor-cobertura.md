# Migración `20260823234500_cobertura_editor_pincel_y_zonas`

**Fecha:** 2026-08-23 · **Rama:** `incremento-2/mapa` · **CU:** CU-59, CU-60

Habilita el editor de cobertura del administrador: pintar con pincel y dibujar
polígonos, en vez de tener los datos del mapa de calor cargados por seed.

---

## Resumen de cambios

| # | Objeto | Tipo | Reversible |
|---|---|---|---|
| 1 | `punto_cobertura` | `DELETE` de filas duplicadas por `(latitud, longitud)` | ❌ **No** — borra datos |
| 2 | `uq_punto_cobertura_celda` | Índice único nuevo sobre `punto_cobertura(latitud, longitud)` | ✅ Sí |
| 3 | `zona_cobertura` | Tabla nueva | ✅ Sí |
| 4 | `idx_zona_cobertura_activo` | Índice nuevo | ✅ Sí |
| 5 | `fk_zona_cobertura_id_empresa` | FK nueva hacia `empresa` | ✅ Sí |

**Ninguna columna existente cambia de tipo, nombre o nulabilidad.** El único
riesgo de pérdida de datos está en el paso 1.

---

## 1. Dedupe de `punto_cobertura` ⚠️

```sql
DELETE FROM "punto_cobertura" a
USING "punto_cobertura" b
WHERE a."latitud" = b."latitud" AND a."longitud" = b."longitud" AND (...)
```

### Por qué

El índice único del paso 2 falla si ya existen dos filas con el mismo par
`(latitud, longitud)`. La migración quedaría aplicada a medias.

### Qué borra

De cada grupo de filas que comparten coordenada exacta, conserva **una**:

1. la de mayor `densidad_cobertura`;
2. a igual densidad, la de menor `id_punto` (la más antigua).

### Riesgo real

Bajo. Los datos previos vienen de `prisma/seed-cobertura.sql`, que genera
coordenadas aleatorias con 6 decimales — la probabilidad de colisión entre 176
puntos es despreciable. En la base de desarrollo el `DELETE` no tocó ninguna fila.

**Antes de correr esto en un entorno con datos reales**, contar los duplicados:

```sql
SELECT "latitud", "longitud", COUNT(*)
FROM "punto_cobertura"
GROUP BY 1, 2
HAVING COUNT(*) > 1;
```

Si devuelve filas, revisar caso a caso antes de aplicar la migración — puede
indicar que los puntos representan algo distinto a lo que asume este modelo.

---

## 2. `uq_punto_cobertura_celda` — el cambio conceptual

Este es el cambio importante, aunque sea solo un índice: **redefine qué es una
fila de `punto_cobertura`.**

| Antes | Después |
|---|---|
| Un punto suelto con coordenada arbitraria | Una **celda de una grilla fija** |

El editor redondea cada coordenada al paso de grilla antes de guardar
(`apps/controller/src/cobertura/cobertura-grid.ts`). Como el par queda único, el
pincel puede hacer `UPSERT`: repintar la misma celda **actualiza** su densidad en
vez de insertar otra fila.

Sin este índice, arrastrar el pincel cinco segundos sobre la misma zona dejaría
miles de filas superpuestas y el mapa se volvería inservible.

**Consecuencia para quien escriba código nuevo:** insertar en `punto_cobertura`
sin redondear a la grilla ya no es seguro — puede chocar con el índice o crear
celdas "fuera de grilla" que el editor nunca podrá repintar ni borrar. Usar
siempre los helpers de `cobertura-grid.ts`.

---

## 3. Tabla `zona_cobertura`

```sql
CREATE TABLE "zona_cobertura" (
    "id_zona"             SERIAL PRIMARY KEY,
    "id_empresa"          INTEGER,          -- FK → empresa, opcional
    "nombre"              VARCHAR(80),
    "densidad_cobertura"  DECIMAL(5,2) NOT NULL,
    "tipo_cobertura"      VARCHAR(20),
    "vertices"            JSONB NOT NULL,
    "activo"              BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion"      TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);
```

### Formato de `vertices`

Anillo exterior del polígono, **sin cerrar** (el último vértice conecta con el
primero), mínimo 3 vértices:

```json
[[-33.58, -70.63], [-33.58, -70.61], [-33.60, -70.61], [-33.60, -70.63]]
```

Orden: `[latitud, longitud]` — el mismo que usa Leaflet, no el `[lng, lat]` de
GeoJSON. Se eligió así para no tener que invertir en cada render.

### Por qué JSONB y no PostGIS

- El Postgres de desarrollo (`postgres:15-alpine` del `docker-compose.yml`) no
  trae la extensión PostGIS, y agregarla obligaría a mantener una imagen propia
  solo para esto.
- El point-in-polygon se resuelve en Node al rasterizar (ray casting), con
  volúmenes chicos: decenas de polígonos contra ~20.000 celdas de la grilla
  gruesa, bien por debajo de 50 ms.

Si más adelante se instala PostGIS, `vertices` se puede migrar a
`geometry(Polygon, 4326)` sin tocar el resto del modelo — nada más depende de la
representación interna.

### `activo` en vez de borrar

Bajar una zona no borra la fila: se marca `activo = false`. Así el administrador
puede recuperar un polígono que apagó por error, y queda el rastro de qué se
publicó alguna vez. El mapa público filtra por `activo = true`.

---

## Cómo se combinan las dos capas

`GET /api/cobertura/puntos` **no** devuelve las filas crudas de la tabla. El
backend construye la respuesta así:

1. Rasteriza los polígonos activos sobre la grilla pública (paso grueso).
2. Superpone las celdas del pincel; **el pincel siempre gana** sobre el polígono.
3. Agrega el resultado y devuelve la lista de puntos del heatmap.

Es decir: el polígono es el relleno base y el pincel el retoque encima. Ver
[`apps/controller/docs/cobertura.md`](../../apps/controller/docs/cobertura.md).

---

## Rollback

Los pasos 2 a 5 se revierten sin pérdida:

```sql
ALTER TABLE "zona_cobertura" DROP CONSTRAINT "fk_zona_cobertura_id_empresa";
DROP INDEX "idx_zona_cobertura_activo";
DROP TABLE "zona_cobertura";
DROP INDEX "uq_punto_cobertura_celda";
```

El paso 1 **no se revierte**: las filas duplicadas borradas no vuelven. Si hace
falta conservarlas, respaldar antes de migrar:

```sql
CREATE TABLE punto_cobertura_backup AS SELECT * FROM "punto_cobertura";
```

Además, tras el rollback hay que quitar del schema de Prisma el modelo
`zona_cobertura`, la relación `zona_cobertura[]` en `empresa` y el `@@unique` de
`punto_cobertura`, y volver a correr `pnpm exec prisma generate`.

---

## Verificación post-migración

```sql
-- 1. El índice único existe
SELECT indexname FROM pg_indexes
WHERE tablename = 'punto_cobertura' AND indexname = 'uq_punto_cobertura_celda';

-- 2. No quedan duplicados
SELECT COUNT(*) FROM (
  SELECT 1 FROM "punto_cobertura" GROUP BY "latitud", "longitud" HAVING COUNT(*) > 1
) d;  -- debe dar 0

-- 3. La tabla nueva responde
SELECT COUNT(*) FROM "zona_cobertura";
```
