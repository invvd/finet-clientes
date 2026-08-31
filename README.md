# Monorepo Finet

Plataforma de gestión de clientes para Fibernet Limitada (Finet) — Internet de fibra óptica.

## Estructura

```
finet-clientes/
├── pnpm-workspace.yaml        ← Workspace pnpm (apps/*)
├── package.json               ← Scripts del monorepo
├── .env.example               ← Referencia de todas las variables
├── apps/
│   ├── controller/            ← @finet/controller — API REST (NestJS + Prisma + PostgreSQL)
│   │   └── .env.example       ← Variables del backend
│   └── view/                  ← @finet/view — Cliente web (Next.js + React + Tailwind)
│       └── .env.example       ← Variables del frontend
└── README.md
```

## Requisitos

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (para el backend)

## Inicio rápido

```bash
# Instalar dependencias de todo el monorepo (desde raíz)
pnpm install

# Configurar variables de entorno
cp apps/controller/.env.example apps/controller/.env
cp apps/view/.env.example apps/view/.env

# Base de datos (migraciones + generate)
pnpm -C apps/controller prisma migrate dev

# Desarrollo (ambos apps en paralelo)
pnpm dev
```

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm install` | Instalar dependencias de todos los paquetes |
| `pnpm dev` | Levantar backend + frontend en paralelo |
| `pnpm dev:controller` | Solo backend (NestJS) |
| `pnpm dev:view` | Solo frontend (Next.js) |
| `pnpm build` | Build de todos los paquetes |
| `pnpm lint` | Lint de todos los paquetes |
| `pnpm test` | Tests de todos los paquetes |
| `pnpm -C apps/controller prisma ...` | Comandos Prisma (migrate, generate, studio) |

## Variables de entorno

### Backend (`apps/controller/.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `PORT` | Puerto del servidor (default: 4000) |

### Frontend (`apps/view/.env`)

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de la API backend |
| `JWT_SECRET` | Debe coincidir con el backend (validación en middleware) |
| `NEXT_PUBLIC_SITE_URL` | URL del sitio en producción |

## Licencia

Propietario — Fibernet Limitada.
