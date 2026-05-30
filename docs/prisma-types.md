# Generacion de tipos desde Prisma

Este proyecto genera **dos capas de tipos** a partir de `prisma/schema.prisma`.

## Generadores

Ambos generadores estan declarados al inicio del schema (`prisma/schema.prisma:1-13`):

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "../src/generated/zod"
}
```

### 1. Prisma Client (`@prisma/client`)

| Aspecto | Valor |
|---|---|
| Definicion | `generator client` en `schema.prisma` |
| Output | `generated/prisma/` |
| Dependencia | `@prisma/client` (npm) |
| Comando | `prisma generate` |

**Archivos generados principales:**

| Ruta | Contenido |
|---|---|
| `generated/prisma/client.ts` | `PrismaClient` y constructores (incluye `PrismaPg` adapter) |
| `generated/prisma/models.ts` | Re-exporta todos los modelos |
| `generated/prisma/models/<modelo>.ts` | Tipos por modelo: `create`, `update`, `where`, `select`, `include`, payloads, delegates |
| `generated/prisma/commonInputTypes.ts` | Tipos compartidos (filtros, operadores: `StringFilter`, `DateTimeFilter`, etc.) |
| `generated/prisma/enums.ts` | Enums definidos en el schema (si los hay) |
| `generated/prisma/internal/` | Namespace interno de Prisma (no importar directamente) |
| `generated/prisma/browser.ts` | Cliente para edge/browser (no usado en este proyecto) |

**Import en el proyecto** (`src/prisma/prisma.service.ts:3`):

```ts
import { PrismaClient } from '../../generated/prisma/client.js';
```

El `PrismaService` extiende `PrismaClient` y lo inyecta como provider global (`src/prisma/prisma.module.ts`).

### 2. Zod schemas (`prisma-zod-generator`)

| Aspecto | Valor |
|---|---|
| Definicion | `generator zod` en `schema.prisma` |
| Output | `src/generated/zod/` |
| Dependencia | `prisma-zod-generator` (dev) |
| Comando | `prisma generate` |

**Archivos generados principales:**

| Ruta | Contenido |
|---|---|
| `src/generated/zod/schemas/objects/<Modelo>.schema.ts` | Zod schema para el modelo |
| `src/generated/zod/schemas/enums/` | Schemas para enums de Prisma |
| `src/generated/zod/schemas/results/` | Schemas para tipos de resultado |
| `src/generated/zod/schemas/variants/` | Schemas para variantes (seleccion omitida, etc.) |
| `src/generated/zod/helpers/decimal-helpers.ts` | Helpers para campos `Decimal` |
| `src/generated/zod/helpers/json-helpers.ts` | Helpers para campos `Json` |

**Uso actual:** los schemas Zod generados estan disponibles pero el proyecto usa DTOs Zod **manuales** en `src/auth/dto/`. Los schemas generados pueden usarse como validacion complementaria (ej: para validar inputs de creacion/actualizacion de modelos completos).

## Comandos

```bash
# Generar ambos: Prisma Client + Zod schemas
pnpm prisma generate

# Crear migracion desde cambios en schema + regenerar
pnpm prisma migrate dev --name <nombre>

# Solo aplicar migraciones pendientes (prod)
pnpm prisma migrate deploy
```

## Flujo de trabajo tipico

1. Editar `prisma/schema.prisma` (agregar/quitar modelos, campos, relaciones)
2. Ejecutar `pnpm prisma migrate dev --name <descripcion>`
   - Esto genera el SQL de migracion en `prisma/migrations/`
   - Aplica la migracion a la DB
   - Regenera Prisma Client y Zod schemas automaticamente
3. Los nuevos tipos estan disponibles inmediatamente en `generated/prisma/` y `src/generated/zod/`
4. Importar donde se necesiten

## Notas

- **Los archivos en `generated/prisma/` y `src/generated/zod/` son auto-generados** — no se editan manualmente.
- `generated/prisma/` esta fuera de `src/` para evitar que el build de NestJS procese ~8MB de tipos generados.
- `src/generated/zod/` esta dentro de `src/` para que pueda importarse sin alias.
- Si `prisma generate` falla, verifica que `DATABASE_URL` este accesible (el generador necesita conectarse para introspeccion adicional).
