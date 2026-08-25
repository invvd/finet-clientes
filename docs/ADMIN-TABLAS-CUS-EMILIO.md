# Tablas que necesitan los CU de Emilio (bloque Deuda)

Pendientes de aplicar en la base global. Solo las necesitan CU-80 y CU-47;
CU-54, CU-55 y CU-56 funcionan con la base tal como está.

## Tabla nueva: `configuracion_morosidad`

| Campo | Tipo | Nulo |
|---|---|---|
| `id_configuracion` | `SERIAL` PK | no |
| `id_empresa` | `INTEGER` FK → `empresa` | no |
| `dias_gracia` | `SMALLINT` | no |
| `umbral_suspension` | `DECIMAL(10,2)` | no |
| `fecha_actualizacion` | `TIMESTAMP(6)` | sí |

```sql
CREATE TABLE "configuracion_morosidad" (
    "id_configuracion"    SERIAL         NOT NULL,
    "id_empresa"          INTEGER        NOT NULL,
    "dias_gracia"         SMALLINT       NOT NULL,
    "umbral_suspension"   DECIMAL(10,2)  NOT NULL,
    "fecha_actualizacion" TIMESTAMP(6)   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "configuracion_morosidad_pkey" PRIMARY KEY ("id_configuracion")
);

CREATE UNIQUE INDEX "configuracion_morosidad_id_empresa_key"
    ON "configuracion_morosidad"("id_empresa");

ALTER TABLE "configuracion_morosidad"
    ADD CONSTRAINT "fk_configuracion_morosidad_id_empresa"
    FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- fila inicial (ajustar valores)
INSERT INTO "configuracion_morosidad" ("id_empresa", "dias_gracia", "umbral_suspension")
VALUES (1, 5, 0.00);
```

## Tabla a modificar: `contrato`

Un campo nuevo, nullable. Lo escribe el cron de CU-47.

| Campo | Tipo | Nulo |
|---|---|---|
| `fecha_morosidad` | `DATE` | **sí** — `NULL` = al día |

```sql
ALTER TABLE "contrato" ADD COLUMN "fecha_morosidad" DATE;
```

Los dos cambios son aditivos: no tocan ninguna columna existente ni sus
restricciones, y al ser nullable los `SELECT *` e `INSERT` actuales siguen igual.
