# Finet Clientes Backend

Backend para el portal de clientes basado en NestJS, Prisma y PostgreSQL.

## Stack

- Node.js + NestJS (ESM)
- PostgreSQL + Prisma
- Zod para validacion
- JWT para autenticacion
- pnpm como gestor de paquetes

## Requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 14+

## Configuracion

Copia el archivo de entorno de ejemplo y ajusta los valores:

```bash
$ cp .env.example .env
```

Variables principales:

- `DATABASE_URL` conexion a PostgreSQL
- `JWT_SECRET` secreto para firmar JWT
- `CORS_ORIGIN` lista separada por comas de orígenes permitidos
- `NODE_ENV` usa `production` en prod

## Base de datos local (Docker + Prisma)

Levantar Postgres local:

```bash
$ docker compose up -d
```

Generar tablas desde migraciones:

```bash
$ pnpm prisma migrate deploy
```

Generar Prisma Client (si lo necesitas):

```bash
$ pnpm prisma generate
```

## Scripts

```bash
# instalar dependencias
$ pnpm install

# desarrollo
$ pnpm run start:dev

# produccion
$ pnpm run start:prod

# tests
$ pnpm run test
```

## Estructura relevante

- `src/auth` modulo de autenticacion de clientes
- `src/common` utilidades comunes (RUT, filtros)
- `src/prisma` cliente Prisma y conexion DB
- `src/generated` salida de zod (excluida del build)

## Documentacion

- `docs/auth-feature.md` autenticacion de clientes

## Feature: autenticacion de clientes

La documentacion tecnica completa esta en `docs/auth-feature.md`.

## Notas de despliegue

- En prod, `CORS_ORIGIN` es obligatorio.
- Se requiere `JWT_SECRET` en todos los entornos.
