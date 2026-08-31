-- Datos de ejemplo para el visor cartográfico (CU-59 a CU-62).
--
-- Datos ficticios de desarrollo: NO representan la red real de Finet, solo
-- alimentan el mapa de calor y el editor para poder probarlos en local.
--
--   pnpm -C apps/controller db:seed:cobertura
--
-- ⚠️ Las coordenadas se redondean a la grilla fina (0.0005°, ver
-- `src/cobertura/cobertura-grid.ts`). Un punto fuera de grilla se dibuja en el
-- mapa pero el pincel nunca lo puede repintar ni borrar, porque el editor solo
-- toca coordenadas alineadas. Ver docs/db/2026-08-23-editor-cobertura.md.

TRUNCATE TABLE "punto_cobertura" RESTART IDENTITY;
TRUNCATE TABLE "zona_cobertura" RESTART IDENTITY;

-- Semilla fija: los mismos datos en cada corrida.
SELECT setseed(0.42);

-- 1) Celdas del pincel ------------------------------------------------------
--
-- El DISTINCT ON es obligatorio: al redondear a la grilla, dos puntos
-- aleatorios cercanos caen en la misma celda y chocarían con el índice único
-- `uq_punto_cobertura_celda`. De cada celda repetida gana la densidad más alta.
INSERT INTO "punto_cobertura" ("latitud", "longitud", "densidad_cobertura", "tipo_cobertura")
SELECT DISTINCT ON (latitud, longitud) latitud, longitud, densidad, tipo
FROM (
  SELECT
    ROUND((ROUND((zona.lat + (random() - 0.5) * zona.dispersion) / 0.0005) * 0.0005)::numeric, 6) AS latitud,
    ROUND((ROUND((zona.lng + (random() - 0.5) * zona.dispersion) / 0.0005) * 0.0005)::numeric, 6) AS longitud,
    ROUND((zona.densidad * (0.55 + random() * 0.45))::numeric, 2) AS densidad,
    zona.tipo AS tipo
  FROM (
    VALUES
      -- La Pintana
      (-33.5830, -70.6330, 0.040, 95.0, 'fibra'),
      (-33.5960, -70.6420, 0.030, 72.0, 'fibra'),
      (-33.5750, -70.6180, 0.028, 58.0, 'mixta'),
      -- Puente Alto
      (-33.6110, -70.5750, 0.042, 98.0, 'fibra'),
      (-33.6250, -70.5620, 0.032, 76.0, 'fibra'),
      (-33.5980, -70.5880, 0.026, 61.0, 'mixta'),
      -- Bordes con cobertura parcial
      (-33.6400, -70.6050, 0.036, 34.0, 'parcial'),
      (-33.5650, -70.5900, 0.034, 28.0, 'parcial')
  ) AS zona(lat, lng, dispersion, densidad, tipo),
  LATERAL generate_series(1, 22)
) AS celdas
ORDER BY latitud, longitud, densidad DESC;

-- 2) Polígonos --------------------------------------------------------------
--
-- `vertices` es [[lat, lng], ...] sin cerrar — el último vértice conecta con el
-- primero. Dos zonas de ejemplo para ver el relleno base bajo el pincel.
INSERT INTO "zona_cobertura" ("nombre", "densidad_cobertura", "tipo_cobertura", "vertices", "activo")
VALUES
  (
    'La Pintana norte',
    78.00,
    'fibra',
    '[[-33.5700,-70.6450],[-33.5700,-70.6150],[-33.5900,-70.6150],[-33.5900,-70.6450]]'::jsonb,
    true
  ),
  (
    'Puente Alto centro',
    88.00,
    'fibra',
    '[[-33.6000,-70.5900],[-33.6000,-70.5600],[-33.6250,-70.5600],[-33.6250,-70.5900]]'::jsonb,
    true
  );
