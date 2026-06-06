# API de Autenticacion de Clientes

Autenticacion exclusiva para clientes (`cliente`), empresa 1.

Base URL: `http://localhost:3000/api`

## Endpoints

| Metodo | Ruta | Auth | Rate Limit | Descripcion |
|---|---|---|---|---|
| `POST` | `/auth/login` | No | 5 req/min | Iniciar sesion con RUT y contraseña |
| `POST` | `/auth/register` | No | 3 req/min | Registrar nuevo cliente + JWT |
| `POST` | `/auth/recuperar-password` | No | 3 req/min | Solicitar token de recuperacion |
| `POST` | `/auth/restablecer-password` | No | 3 req/min | Restablecer contraseña con token |
| `POST` | `/auth/logout` | JWT | 10 req/min | Cerrar sesion activa |
| `GET` | `/auth/perfil` | JWT | 10 req/min | Obtener datos del cliente autenticado |
| `GET` | `/admin/intentos-fallidos` | API Key | 10 req/min | Historial de intentos fallidos |
| `POST` | `/admin/intentos-fallidos/desbloquear-ip` | API Key | 10 req/min | Desbloquear una IP manualmente |

---

## POST /auth/login

Inicia sesion con RUT y contraseña.

```
POST /api/auth/login
Content-Type: application/json

{
  "rut": "12.345.678-5",
  "password": "tu_password"
}
```

**Respuesta 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "cliente": {
    "id": 123,
    "rut": "123456785",
    "nombre_completo": "Nombre Apellido",
    "email": "cliente@correo.com",
    "telefono": "+56911111111"
  }
}
```

**Errores:**
| Codigo | Mensaje | Causa |
|---|---|---|
| 400 | Validation failed | RUT con formato invalido o DV incorrecto |
| 401 | RUT o contraseña incorrectos | Credenciales invalidas o cuenta no activa |
| 401 | RUT bloqueado temporalmente | 5 intentos fallidos contra el mismo RUT en 10 min → bloqueo 15 min |
| 401 | IP bloqueada temporalmente | 5 intentos fallidos desde la misma IP en 5 min → bloqueo 15 min |
| 429 | ThrottlerException | Excede 5 req/min |

---

## POST /auth/register

Registra un nuevo cliente y devuelve JWT automaticamente.

```
POST /api/auth/register
Content-Type: application/json

{
  "rut": "12.345.678-5",
  "nombre_completo": "Juan Perez",
  "email": "juan@ejemplo.cl",
  "telefono": "912345678",
  "password": "MiClave1"
}
```

**Validacion de contraseña:**
- Minimo 8 caracteres
- Al menos 1 mayuscula
- Al menos 1 numero
- Maximo 72 caracteres (limite bcrypt)

**Campos opcionales:** `email`, `telefono` (pueden omitirse o enviarse como `""`)

**Respuesta 201:**
```json
{
  "access_token": "eyJhbGciOi...",
  "cliente": {
    "id": 456,
    "rut": "123456785",
    "nombre_completo": "Juan Perez",
    "email": "juan@ejemplo.cl",
    "telefono": "912345678"
  }
}
```

**Errores:**
| Codigo | Mensaje | Causa |
|---|---|---|
| 400 | Validation failed | Campos invalidos (RUT, email, contraseña debil) |
| 409 | No se pudo completar el registro | RUT o email duplicado |
| 429 | ThrottlerException | Excede 3 req/min |

---

## POST /auth/recuperar-password

Solicita un token para restablecer la contraseña. **Siempre devuelve el mismo mensaje generico** por seguridad (no revela si el RUT existe o no). Si el RUT existe y tiene correo, se envia el enlace de recuperacion por email.

```
POST /api/auth/recuperar-password
Content-Type: application/json

{
  "rut": "12.345.678-5"
}
```

**Respuesta 200 (siempre la misma):**
```json
{
  "message": "Si el RUT esta registrado, recibiras un enlace de recuperacion"
}
```

**Comportamiento interno:**
- RUT registrado con email → genera token JWT `type: "reset"` (15 min), envia email con enlace (token en fragmento `#token=...`, no visible al servidor)
- RUT registrado sin email → registra incidente en `intento_fallido`, no envia email
- RUT no registrado → no hace nada, mismo mensaje generico

**Errores:**
| Codigo | Mensaje | Causa |
|---|---|---|
| 400 | Validation failed | RUT con formato invalido o DV incorrecto |
| 429 | ThrottlerException | Excede 3 req/min |

**Notas:**
- El token en el enlace es un JWT firmado con claim `type: "reset"`, expira en 15 minutos.
- Si falla el envio del email, se registra en el log del servidor y se devuelve el mensaje generico igualmente.

---

## POST /auth/restablecer-password

Restablece la contraseña usando el token de recuperacion.

```
POST /api/auth/restablecer-password
Content-Type: application/json

{
  "token": "eyJhbGciOi...",
  "password": "NuevaClave1"
}
```

**Respuesta 200:**
```json
{
  "message": "Contraseña restablecida exitosamente"
}
```

**Efectos:**
- Actualiza `password_portal_hash` en la tabla `cliente`
- Invalida todas las sesiones activas del cliente (fuerza re-login)
- Envia email de confirmacion si el cliente tiene correo asociado

**Errores:**
| Codigo | Mensaje | Causa |
|---|---|---|
| 400 | Token invalido o expirado | Token expiro (>15 min) o firma invalida |
| 400 | Token invalido | El token no es de tipo `reset` (ej: token de sesion) |
| 429 | ThrottlerException | Excede 3 req/min |

---

## POST /auth/logout

Cierra la sesion activa del cliente autenticado.

```
POST /api/auth/logout
Authorization: Bearer <jwt>
```

**Respuesta 200:**
```json
{
  "message": "Sesion cerrada exitosamente"
}
```

**Errores:**
| Codigo | Causa |
|---|---|
| 401 | JWT invalido, expirado, o sesion expirada por inactividad |

---

## GET /auth/perfil

Obtiene los datos del cliente autenticado.

```
GET /api/auth/perfil
Authorization: Bearer <jwt>
```

**Respuesta 200:**
```json
{
  "id_cliente": 123,
  "rut": "123456785",
  "nombre_completo": "Nombre Apellido",
  "email": "cliente@correo.com",
  "telefono": "+56911111111",
  "estado": "activo"
}
```

**Errores:**
| Codigo | Causa |
|---|---|
| 401 | JWT invalido, expirado, cliente no encontrado, o sesion expirada por inactividad |

---

## GET /admin/intentos-fallidos

Consulta el historial de intentos fallidos de login. Requiere API Key.

```
GET /api/admin/intentos-fallidos?bloqueados=true&page=1&limit=20
X-API-Key: <ADMIN_API_KEY>
```

**Query params (todos opcionales):**

| Param | Tipo | Default | Descripcion |
|---|---|---|---|
| `rut` | string | — | Filtra por RUT exacto (sin puntos ni guion) |
| `ip` | string | — | Filtra por direccion IP exacta |
| `bloqueados` | `true` \| `false` | — | Solo con bloqueo activo (`bloqueado_hasta > now`) o inactivos |
| `desde` | string (fecha) | — | Intentos desde esta fecha (`YYYY-MM-DD`) |
| `hasta` | string (fecha) | — | Intentos hasta esta fecha (`YYYY-MM-DD`) |
| `page` | number | 1 | Numero de pagina |
| `limit` | number | 20 | Resultados por pagina (max 100) |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id_intento": "15",
      "rut_intentado": "123456785",
      "ip_address": "192.168.1.50",
      "timestamp": "2026-05-30T14:00:00.000Z",
      "bloqueado_hasta": "2026-05-30T14:15:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

**Errores:**
| Codigo | Causa |
|---|---|
| 401 | Falta header `X-API-Key`, key invalida, o `ADMIN_API_KEY` no configurado |

---

## POST /admin/intentos-fallidos/desbloquear-ip

Desbloquea manualmente una IP, eliminando el `bloqueado_hasta` de todos los registros activos. La accion queda registrada en `log_auditoria`.

```
POST /api/admin/intentos-fallidos/desbloquear-ip
X-API-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "ip": "192.168.1.50"
}
```

**Respuesta 200:**
```json
{
  "desbloqueado": true,
  "registros_afectados": 5
}
```

**IP no bloqueada — Respuesta 200:**
```json
{
  "desbloqueado": false,
  "registros_afectados": 0
}
```

**Errores:**
| Codigo | Causa |
|---|---|
| 400 | IP con formato invalido |
| 401 | API Key invalida o faltante |

---

## Sesiones e inactividad

- Cada login/register crea una sesion en `sesion_portal` con `fecha_expiracion = now + 15 min`.
- En cada request autenticado, se extiende la sesion otros 15 minutos (sliding window).
- Si pasan 15 minutos sin requests → `401 Sesion expirada por inactividad`.
- El JWT tiene expiracion de 7 dias, pero la sesion en DB vence por inactividad.
- Logout expira la sesion inmediatamente.

Configurable via `.env`: `SESSION_INACTIVITY_MINUTES=15`

---

## Rate Limiting global

Configurado via `ThrottlerGuard` global en `app.module.ts`:

| Endpoint | Rate Limit |
|---|---|
| `POST /auth/login` | 5 req/min |
| `POST /auth/register` | 3 req/min |
| `POST /auth/recuperar-password` | 3 req/min |
| `POST /auth/restablecer-password` | 3 req/min |
| Todos los demas | 10 req/min (default) |

---

## Variables de entorno

| Variable | Requerida | Descripcion |
|---|---|---|
| `DATABASE_URL` | Si | Conexion PostgreSQL |
| `JWT_SECRET` | Si | Secreto para firmar JWT |
| `ADMIN_API_KEY` | Si | API Key para endpoints admin |
| `SESSION_INACTIVITY_MINUTES` | No (default: 15) | Minutos de inactividad para expirar sesion |
| `FRONTEND_URL` | Si | URL base del frontend para enlaces de recuperacion |
| `SMTP_HOST` | No (default: localhost) | Servidor SMTP para envio de emails |
| `SMTP_PORT` | No (default: 1025) | Puerto SMTP |
| `SMTP_USER` | No | Usuario SMTP (no necesario en dev con Mailpit) |
| `SMTP_PASS` | No | Contraseña SMTP (no necesario en dev con Mailpit) |
| `MAIL_FROM` | No | Remitente de emails ("Portal Clientes" <no-reply@finet.cl>) |
| `CORS_ORIGIN` | No | Origenes CORS permitidos (separados por coma) |
| `NODE_ENV` | No | `development` o `production` |
| `PORT` | No (default: 4000) | Puerto del servidor |

---

## Probar con curl

```bash
BASE_URL=http://localhost:3000/api

# Login
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"rut":"12.345.678-5","password":"MiClave1"}'

# Register
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"rut":"12.345.678-5","nombre_completo":"Juan Perez","email":"juan@test.cl","password":"MiClave1"}'

# Recuperar password
curl -X POST "$BASE_URL/auth/recuperar-password" \
  -H "Content-Type: application/json" \
  -d '{"rut":"12.345.678-5"}'

# Restablecer password
curl -X POST "$BASE_URL/auth/restablecer-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","password":"NuevaClave1"}'

# Perfil
curl -X GET "$BASE_URL/auth/perfil" \
  -H "Authorization: Bearer <jwt>"

# Logout
curl -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer <jwt>"

# Admin - Intentos fallidos
curl -X GET "$BASE_URL/admin/intentos-fallidos?bloqueados=true" \
  -H "X-API-Key: finet-admin-key-2026-dev"

# Admin - Desbloquear IP
curl -X POST "$BASE_URL/admin/intentos-fallidos/desbloquear-ip" \
  -H "X-API-Key: finet-admin-key-2026-dev" \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.50"}'
```

## Seguridad aplicada

- Rate limiting global con `@Throttle` por endpoint
- Bloqueo temporal por intentos fallidos (doble capa):
  - Por RUT: 5 intentos en 10 min → 15 min de bloqueo
  - Por IP: 5 intentos en 5 min → 15 min de bloqueo
- JWT con `JWT_SECRET` obligatorio, expiracion 7 dias
- Sesiones con sliding window de inactividad (15 min)
- Una sesion activa por cliente (login invalida sesiones anteriores)
- Password hasheada con bcrypt (salt rounds 10)
- Validacion Zod en todos los DTOs
- Reset token con claim `type: "reset"` para evitar reuso de token de sesion
- Reset token enviado en fragmento de URL (`#token=...`) para no exponerlo en logs del servidor
- Login rechaza cuentas con estado distinto a `'activo'` (mensaje generico identico)
- Admin protegido con `X-API-Key`
- CORS configurable via `CORS_ORIGIN`
- Helmet con HSTS en produccion para headers de seguridad HTTP

## Archivos clave

| Archivo | Proposito |
|---|---|
| `src/auth/auth.controller.ts` | Endpoints de autenticacion |
| `src/auth/auth.service.ts` | Logica de negocio (login, register, password reset, sesiones) |
| `src/auth/dto/login.dto.ts` | Validacion Zod para login |
| `src/auth/dto/register.dto.ts` | Validacion Zod para register |
| `src/auth/dto/recuperar-password.dto.ts` | Validacion Zod para recuperar password |
| `src/auth/dto/restablecer-password.dto.ts` | Validacion Zod para restablecer password |
| `src/auth/strategies/jwt.strategy.ts` | Estrategia JWT + validacion de sesion por inactividad |
| `src/auth/guards/jwt-auth.guard.ts` | Guard JWT |
| `src/auth/guards/` | (futuro) Guards adicionales |
| `src/mail/mail.service.ts` | Servicio de envio de emails (nodemailer) |
| `src/mail/mail.module.ts` | Modulo global de mail |
| `src/common/utils/rut.ts` | Limpieza y validacion de RUT chileno |
| `src/admin/admin.controller.ts` | Endpoints admin |
| `src/admin/admin.service.ts` | Logica de admin |
| `src/admin/guards/api-key.guard.ts` | Guard para API Key |
| `src/app.module.ts` | Modulo raiz con ThrottlerGuard global |

## Email en desarrollo

El proyecto incluye **Mailpit** en `docker-compose.yml` para capturar emails en desarrollo.

```bash
docker compose up -d mailpit
```

- SMTP: `localhost:1025` (sin auth)
- Web UI: `http://localhost:8025` (todos los emails capturados)

En produccion, configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` con un proveedor SMTP real.
