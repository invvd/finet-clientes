# Monorepo Finet

Plataforma de gestión de clientes para Fibernet Limitada (Finet) — Internet de fibra óptica en La Pintana y Puente Alto.

## Estructura

```
finet-clientes/
├── .env.example              ← Referencia de todas las variables
├── apps/
│   ├── controller/           ← API REST (NestJS + Prisma + PostgreSQL)
│   │   └── .env.example      ← Variables del backend
│   └── view/                 ← Cliente web (Next.js + React + Tailwind)
│       └── .env.example      ← Variables del frontend
└── README.md
```

## Requisitos

- Node.js >= 20
- npm >= 10
- PostgreSQL (para el backend)

## Inicio rápido

```bash
# Backend
cd apps/controller
cp .env.example .env   # Configurar variables de entorno
npm install
npx prisma migrate dev
npm run start:dev

# Frontend
cd apps/view
cp .env.example .env   # Configurar variables de entorno
npm install
npm run dev
```

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
