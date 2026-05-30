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

## Feature: autenticacion de clientes

Autenticacion exclusiva para clientes (`cliente`), no para usuarios internos.

### Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Probar con Postman

Base URL:

```
http://localhost:3000
```

#### Login

`POST /api/auth/login`

Headers:

```
Content-Type: application/json
```

Body (JSON):

```json
{
  "rut": "12.345.678-5",
  "password": "tu_password"
}
```

Respuesta exitosa (200):

```json
{
  "access_token": "<jwt>",
  "cliente": {
    "id": 123,
    "rut": "12345678",
    "nombre_completo": "Nombre Apellido",
    "email": "cliente@correo.com",
    "telefono": "+56911111111"
  }
}
```

Notas:

- `rut` debe venir con formato `XX.XXX.XXX-X` y DV valido.
- En DB el RUT se guarda sin guion.
- Si hay 5 intentos fallidos en 10 min, se bloquea por 15 min.

#### Me

`GET /api/auth/me`

Headers:

```
Authorization: Bearer <jwt>
```

Respuesta exitosa (200):

```json
{
  "id_cliente": 123,
  "rut": "12345678",
  "nombre_completo": "Nombre Apellido",
  "email": "cliente@correo.com",
  "telefono": "+56911111111"
}
```

#### Logout

`POST /api/auth/logout`

Headers:

```
Authorization: Bearer <jwt>
```

Respuesta exitosa (200):

```json
{
  "message": "Sesion cerrada exitosamente"
}
```

### Probar con curl

Base URL:

```bash
BASE_URL=http://localhost:3000
```

Login:

```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"rut":"12.345.678-5","password":"tu_password"}'
```

Guardar token en variable (PowerShell):

```powershell
$token = (Invoke-RestMethod -Method Post -Uri "$env:BASE_URL/api/auth/login" -ContentType "application/json" -Body '{"rut":"12.345.678-5","password":"tu_password"}').access_token
```

Me:

```bash
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer <jwt>"
```

Logout:

```bash
curl -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer <jwt>"
```

### Flujo tecnico

1) Login recibe `rut` y `password`.
2) Zod valida formato `XX.XXX.XXX-X` y DV.
3) `cleanRut` normaliza para DB (sin guion).
4) Se consulta `cliente` por `rut`.
5) Se valida hash con bcrypt.
6) Se controla bloqueo por intentos fallidos.
7) Se genera JWT (7 dias) y se guarda sesion en `sesion_portal`.
8) Se invalida cualquier sesion anterior (una activa por cliente).

### Seguridad aplicada

- Rate limit en login: 5 intentos por minuto.
- Bloqueo temporal por intentos fallidos (15 min tras 5 intentos en 10 min).
- JWT con `JWT_SECRET` obligatorio.
- Sesiones persistidas en DB y una activa por cliente.
- CORS: abierto en dev, en prod requiere `CORS_ORIGIN`.
- `trust proxy` en prod para IP correcta.

### Validacion de RUT

- Formato esperado `XX.XXX.XXX-X`.
- DV validado con algoritmo chileno.
- DB almacena RUT sin guion.

### Archivos clave

- `src/auth/auth.controller.ts` endpoints y guards.
- `src/auth/auth.service.ts` login/logout y control de sesiones.
- `src/auth/dto/login.dto.ts` validacion Zod.
- `src/common/utils/rut.ts` limpieza y validacion de RUT.
- `src/auth/strategies/jwt.strategy.ts` JWT.
- `src/main.ts` CORS y filtros globales.

## Notas de despliegue

- En prod, `CORS_ORIGIN` es obligatorio.
- Se requiere `JWT_SECRET` en todos los entornos.
