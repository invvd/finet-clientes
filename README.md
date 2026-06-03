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
- `ADMIN_API_KEY` clave para endpoints admin
- `SESSION_INACTIVITY_MINUTES` minutos de inactividad para expirar sesion (default: 15)
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

### API para Frontend

Documentacion de endpoints organizada por feature (bodies, respuestas, errores, ejemplos fetch):

| Feature | Archivo | Endpoints |
|---------|---------|-----------|
| **Auth** | [`docs/auth.md`](./docs/auth.md) | Login, register, recuperar/restablecer password, logout |
| **Perfil** | [`docs/perfil.md`](./docs/perfil.md) | Obtener perfil, actualizar telefono/email, cambiar contraseña |
| **Portal** | [`docs/portal.md`](./docs/portal.md) | Panel, contratos (estado/vigentes), deuda, tickets |

### Docs tecnicas

- [`docs/api-frontend.md`](./docs/api-frontend.md) — referencia completa de la API (incluye deuda publica y admin)
- [`docs/auth-feature.md`](./docs/auth-feature.md) — diseño de autenticacion
- [`docs/prisma-types.md`](./docs/prisma-types.md) — generacion de tipos desde Prisma

## Notas de despliegue

- En prod, `CORS_ORIGIN` es obligatorio.
- Se requiere `JWT_SECRET` en todos los entornos.
