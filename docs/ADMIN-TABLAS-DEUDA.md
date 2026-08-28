# Cambios de base que necesita el bloque Deuda

**Nada de esto está aplicado.** La base global no se toca desde este repo: el código y el
`schema.prisma` ya asumen estos campos, pero las columnas hay que crearlas en la base
compartida cuando el equipo lo acuerde. Hasta entonces, CU-80 y CU-47 no funcionan contra
una base real.

Solo los necesitan CU-80 y CU-47. CU-54, CU-55 y CU-56 funcionan con la base tal como está.

## Tabla a modificar: `contrato`

Tres columnas nuevas, todas nullable. No hay tabla nueva.

| Campo | Tipo | Nulo | Para qué |
|---|---|---|---|
| `fecha_morosidad` | `DATE` | **sí** — `NULL` = al día | CU-47: fecha desde la que el contrato está moroso. Lo escribe el cron |
| `dias_gracia` | `SMALLINT` | **sí** — `NULL` = sin configurar | CU-80: días después de `factura.fecha_limite_pago` antes de marcarlo moroso |
| `umbral_suspension` | `DECIMAL(10,2)` | **sí** — `NULL` = sin configurar | CU-80: monto de deuda que habilita la suspensión (CU-48) |

```sql
ALTER TABLE "contrato" ADD COLUMN "fecha_morosidad"   DATE;
ALTER TABLE "contrato" ADD COLUMN "dias_gracia"       SMALLINT;
ALTER TABLE "contrato" ADD COLUMN "umbral_suspension" DECIMAL(10,2);
```

Los tres cambios son aditivos: no tocan ninguna columna existente ni sus restricciones, y
al ser nullable los `SELECT *` e `INSERT` actuales siguen funcionando igual.

## Por qué en `contrato` y no en una tabla de configuración aparte

La primera versión creaba una tabla `configuracion_morosidad` con una fila por empresa. Se
descartó en el review del PR #7: agregar una tabla nueva a la base global tiene más costo
de coordinación que agregar columnas nullable, y la configuración por empresa no daba lo
que el negocio necesita.

Con los parámetros en `contrato`, **cada contrato define su propio corte**: según cuándo se
contrató, o según lo que el administrador decida para ese cliente en particular. Una
configuración global por empresa no permitía eso.

## Qué implica el `NULL`

`NULL` no es "cero días de gracia", es "sin configurar". La revisión de CU-47 **omite** esos
contratos y los cuenta aparte en `contratos_omitidos`, en vez de asumir un valor por defecto
que nadie configuró. Es la Excepción 1 del CU llevada al nivel del contrato.

Si ningún contrato tiene parámetros, la revisión no marca nada y deja el fallo
`SIN_CONFIGURACION` en la bitácora.

## Nota de rendimiento

Como los días de gracia ya no son un valor único, la revisión no puede calcular una sola
fecha de corte. Agrupa los contratos por su valor de `dias_gracia` y hace una comparación
por grupo. El rango de `dias_gracia` es 0–90, así que la cantidad de grupos está acotada y
en la práctica son pocos. La comparación de fechas la sigue haciendo la base: no se traen
las facturas impagas a memoria.

Si con datos reales aparecen muchos valores distintos, conviene un índice:

```sql
CREATE INDEX "contrato_dias_gracia_idx" ON "contrato"("dias_gracia");
```
