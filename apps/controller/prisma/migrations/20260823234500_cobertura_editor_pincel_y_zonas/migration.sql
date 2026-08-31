-- Editor de cobertura: pincel + polígonos (CU-59 / CU-60, bloque Mapa del Incremento 2)
--
-- Nota completa de esta migración, con el porqué de cada decisión y el plan de
-- rollback: docs/db/2026-08-23-editor-cobertura.md
--
-- Tres pasos:
--   1. Deduplica `punto_cobertura` por (latitud, longitud) — prerequisito del paso 2.
--   2. Índice único `uq_punto_cobertura_celda`: convierte cada fila en "una celda de
--      la grilla". Es lo que permite que el pincel haga UPSERT al repintar en vez de
--      acumular filas duplicadas hasta reventar la tabla.
--   3. Tabla `zona_cobertura`: polígonos que rellenan el grueso de un área.

-- 1) Dedupe previo -----------------------------------------------------------
--
-- Los datos anteriores al editor (seed aleatorio de `seed-cobertura.sql`) NO están
-- alineados a la grilla, así que en teoría pueden repetir un par (latitud, longitud).
-- Sin este DELETE el CREATE UNIQUE INDEX de abajo falla y la migración queda a medias.
--
-- Criterio: de cada par duplicado sobrevive la fila de mayor densidad; a igual
-- densidad, la de menor `id_punto` (la más antigua).
DELETE FROM "punto_cobertura" a
USING "punto_cobertura" b
WHERE a."latitud" = b."latitud"
  AND a."longitud" = b."longitud"
  AND (
    COALESCE(a."densidad_cobertura", 0) < COALESCE(b."densidad_cobertura", 0)
    OR (
      COALESCE(a."densidad_cobertura", 0) = COALESCE(b."densidad_cobertura", 0)
      AND a."id_punto" > b."id_punto"
    )
  );

-- 2) Una fila = una celda de la grilla ---------------------------------------
CREATE UNIQUE INDEX "uq_punto_cobertura_celda" ON "punto_cobertura"("latitud", "longitud");

-- 3) Polígonos de cobertura --------------------------------------------------
--
-- `vertices` es JSONB con el anillo exterior del polígono: [[lat, lng], ...].
-- No se guarda cerrado — el último vértice conecta con el primero.
--
-- Se usa JSONB y no PostGIS a propósito: la imagen `postgres:15-alpine` del
-- docker-compose no trae la extensión, y el point-in-polygon se resuelve en Node
-- al rasterizar. Si más adelante se instala PostGIS, esta columna se puede
-- migrar a `geometry(Polygon, 4326)` sin tocar el resto del modelo.
CREATE TABLE "zona_cobertura" (
    "id_zona" SERIAL NOT NULL,
    "id_empresa" INTEGER,
    "nombre" VARCHAR(80),
    "densidad_cobertura" DECIMAL(5,2) NOT NULL,
    "tipo_cobertura" VARCHAR(20),
    "vertices" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zona_cobertura_pkey" PRIMARY KEY ("id_zona")
);

-- El mapa público solo lee zonas activas; el editor las lee todas.
CREATE INDEX "idx_zona_cobertura_activo" ON "zona_cobertura"("activo");

-- Mismo criterio NO ACTION que el resto de las FK hacia `empresa` en este schema.
ALTER TABLE "zona_cobertura"
  ADD CONSTRAINT "fk_zona_cobertura_id_empresa"
  FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
