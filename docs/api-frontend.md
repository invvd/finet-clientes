# API del Portal Clientes — Documentación para Frontend

Base URL: `http://localhost:4000/api`

---

## 1. Autenticación

### 1.1 Iniciar sesión (RF-01)

```
POST /api/auth/login
```

**Body:**
```json
{
  "rut": "12.345.678-5",
  "password": "MiClave1"
}
```

**Respuesta 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "cliente": {
    "id": 1,
    "rut": "123456785",
    "nombre_completo": "Juan Pérez",
    "email": "juan@test.cl",
    "telefono": "912345678"
  }
}
```

El backend también setea una cookie `access_token` httpOnly (7 días). Para llamadas autenticadas, enviar el header `Authorization: Bearer <token>` o confiar en la cookie.

**Errores:**
| HTTP | Mensaje | Causa |
|------|---------|-------|
| 400 | `"Formato inválido. Ej: 12.345.678-5"` | RUT mal escrito |
| 400 | `"RUT inválido — dígito verificador incorrecto"` | DV no coincide |
| 401 | `"IP bloqueada temporalmente"` | 5 intentos desde misma IP en 5 min |
| 401 | `"RUT bloqueado temporalmente"` | 5 intentos contra ese RUT en 10 min |
| 401 | `"RUT o contraseña incorrectos"` | Credenciales inválidas |
| 429 | `"ThrottlerException: Too Many Requests"` | +5 req/min |

> **Importante:** El error 401 por credenciales incorrectas no distingue entre RUT inexistente y contraseña errónea — siempre dice `"RUT o contraseña incorrectos"`.

---

### 1.2 Registrar cuenta nueva (RF-10)

```
POST /api/auth/register
```

**Body:**
```json
{
  "rut": "12.345.678-5",
  "nombre_completo": "Juan Pérez",
  "email": "juan@ejemplo.cl",
  "telefono": "912345678",
  "password": "Clave123",
  "password_confirmation": "Clave123"
}
```

`telefono` es opcional (puede omitirse o enviarse como `""`).

**Reglas de contraseña:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 número
- Máximo 72 caracteres

**Respuesta 201:**
```json
{
  "access_token": "eyJhbGciOi...",
  "cliente": {
    "id": 2,
    "rut": "123456785",
    "nombre_completo": "Juan Pérez",
    "email": "juan@ejemplo.cl",
    "telefono": "912345678"
  }
}
```

**Errores:**
| HTTP | Mensaje | Causa |
|------|---------|-------|
| 400 | `"Email es requerido"` | Campo vacío |
| 400 | `"Email inválido"` | Formato incorrecto |
| 400 | `"Contraseña debe tener al menos 8 caracteres"` | Muy corta |
| 400 | `"Contraseña debe contener al menos una mayúscula"` | Falta mayúscula |
| 400 | `"Contraseña debe contener al menos un número"` | Falta número |
| 400 | `"Las contraseñas no coinciden"` | password ≠ password_confirmation |
| 409 | `"El RUT ya está registrado"` | RUT duplicado |
| 409 | `"El email ya está registrado"` | Email duplicado |
| 429 | Rate limit | +3 req/min |

---

### 1.3 Recuperar contraseña (RF-03)

```
POST /api/auth/recuperar-password
```

**Body:**
```json
{
  "rut": "12.345.678-5"
}
```

**Respuesta 200 (siempre la misma):**
```json
{
  "message": "Si el RUT está registrado, recibirás un enlace de recuperación"
}
```

> El sistema nunca revela si el RUT existe. Si existe y tiene email, se envía el enlace por correo. Si no tiene email o no existe, igual responde con este mensaje genérico.

---

### 1.4 Restablecer contraseña (RF-09)

```
POST /api/auth/restablecer-password
```

**Body:**
```json
{
  "token": "eyJhbGciOi...",
  "password": "NuevaClave1"
}
```

El token viene del enlace en el email de recuperación. Expira en **15 minutos**.

**Respuesta 200:**
```json
{
  "message": "Contraseña restablecida exitosamente"
}
```

Efectos: actualiza la contraseña, invalida todas las sesiones activas del cliente, envía email de confirmación.

**Errores:**
| HTTP | Mensaje |
|------|---------|
| 400 | `"Token inválido o expirado"` |
| 400 | `"Token inválido"` (no es de tipo reset) |

---

### 1.5 Cerrar sesión (RF-02)

```
POST /api/auth/logout
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

Limpia la cookie `access_token` y borra la sesión de la base de datos.

**Errores:**
| HTTP | Mensaje |
|------|---------|
| 401 | `"Sesión expirada por inactividad"` |
| 401 | `"Unauthorized"` (JWT inválido) |

---

### 1.6 Cierre automático por inactividad (RF-07)

No es un endpoint. Cada request autenticado extiende la sesión 15 minutos (ventana deslizante). Si pasan 15 minutos sin requests, el próximo request recibe:

```
401 — "Sesión expirada por inactividad"
```

El frontend debe capturar este 401 y redirigir a login con un mensaje informativo.

---

### 1.7 Obtener perfil (RF-01)

```
GET /api/auth/perfil
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "id_cliente": 1,
  "rut": "123456785",
  "nombre_completo": "Juan Pérez",
  "email": "juan@test.cl",
  "telefono": "912345678",
  "estado": "activo"
}
```

---

## 2. Portal Cliente (panel autenticado)

Todos los endpoints requieren `Authorization: Bearer <token>`.

### 2.1 Panel principal (CU-24)

```
GET /api/portal/panel
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "cliente": {
    "id_cliente": 1,
    "nombre_completo": "Juan Pérez",
    "rut": "123456785",
    "email": "juan@test.cl",
    "telefono": "912345678"
  },
  "contratos": [
    {
      "id_contrato": 100,
      "estado": "activo",
      "fecha_inicio": "2025-01-15T00:00:00.000Z",
      "dia_vencimiento": 10,
      "plan": {
        "id_plan": 5,
        "nombre_comercial": "Fibra 600 Megas",
        "tipo_plan": "fibra",
        "velocidad_mbps": 600,
        "precio_mensual": 19990
      }
    }
  ],
  "resumen_deuda": {
    "tiene_deuda": false,
    "saldo_total": 0,
    "facturas_pendientes": []
  },
  "tickets_recientes": [
    {
      "id_ticket": 42,
      "codigo_seguimiento": "FIN-0042",
      "estado": "abierto",
      "prioridad": "media",
      "descripcion": "Internet lento por las tardes",
      "fecha_creacion": "2026-05-20T14:30:00.000Z",
      "fecha_cierre": null,
      "categoria": "Soporte Técnico",
      "origen": "portal"
    }
  ]
}
```

---

### 2.2 Estado operativo de contratos (CU-23)

```
GET /api/portal/contratos/estado
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
[
  {
    "id_contrato": 100,
    "estado": "activo",
    "fecha_inicio": "2025-01-15T00:00:00.000Z",
    "fecha_suspension": null
  },
  {
    "id_contrato": 101,
    "estado": "suspendido",
    "fecha_inicio": "2025-06-01T00:00:00.000Z",
    "fecha_suspension": "2026-04-15T00:00:00.000Z"
  }
]
```

Estados posibles: `"activo"`, `"suspendido"`, `"cortado"`, `"inactivo"`.

---

### 2.3 Planes vigentes (CU-25 / CU-26)

```
GET /api/portal/contratos/vigentes
Authorization: Bearer <token>
```

**Respuesta 200:** Misma estructura que `contratos` en el panel. Incluye `plan` con detalles comerciales.

Si hay 1 contrato → vista de plan único (CU-25). Si hay varios → vista de múltiples planes (CU-26). El frontend decide la vista según `contratos.length`.

---

### 2.4 Estado de deuda (CU-27 / CU-28)

```
GET /api/portal/deuda
Authorization: Bearer <token>
```

**Respuesta 200 (sin deuda — CU-27):**
```json
{
  "tiene_deuda": false,
  "saldo_total": 0,
  "facturas_pendientes": []
}
```

**Respuesta 200 (con deuda — CU-28):**
```json
{
  "tiene_deuda": true,
  "saldo_total": 59880,
  "facturas_pendientes": [
    {
      "id_factura": 201,
      "periodo": "Mayo 2026",
      "monto": 19990,
      "fecha_limite_pago": "2026-05-10T00:00:00.000Z",
      "estado": "pendiente",
      "dias_vencida": 22
    },
    {
      "id_factura": 202,
      "periodo": "Abril 2026",
      "monto": 19990,
      "fecha_limite_pago": "2026-04-10T00:00:00.000Z",
      "estado": "vencida",
      "dias_vencida": 52
    }
  ]
}
```

`dias_vencida` es `null` si la factura aún no ha vencido.

---

### 2.5 Tickets de soporte (CU-29 / CU-30)

```
GET /api/portal/tickets?limite=3
Authorization: Bearer <token>
```

`limite` es opcional. Si se omite, devuelve todos los tickets.

**Respuesta 200:**
```json
{
  "total": 5,
  "tiene_tickets": true,
  "tickets": [
    {
      "id_ticket": 42,
      "codigo_seguimiento": "FIN-0042",
      "estado": "abierto",
      "prioridad": "media",
      "descripcion": "Internet lento",
      "fecha_creacion": "2026-05-20T14:30:00.000Z",
      "fecha_cierre": null,
      "categoria": "Soporte Técnico",
      "origen": "portal"
    }
  ]
}
```

Si `tiene_tickets: false` → vista de estado vacío (CU-29). Si `true` → historial completo (CU-30).

---

## 3. Consulta de deuda pública (sin sesión)

Endpoints públicos, no requieren autenticación.

### 3.1 Consultar por RUT (CU-39)

```
GET /api/deuda-publica/rut?rut=12.345.678-9
```

Formatos de RUT aceptados: `12.345.678-9` o `12345678-9`.

**Respuesta 200 (cliente encontrado):**
```json
{
  "encontrado": true,
  "cliente": {
    "nombre_completo": "Juan Pérez",
    "rut": "12345678-9",
    "codigo_abonado": 100
  },
  "tiene_deuda": true,
  "saldo_total": 39980,
  "facturas": [
    {
      "id_factura": 201,
      "periodo": "Mayo 2026",
      "monto": 19990,
      "fecha_limite_pago": "2026-05-10T00:00:00.000Z",
      "estado": "pendiente",
      "dias_vencida": 22,
      "dias_para_vencer": null
    }
  ]
}
```

**Respuesta 200 (no encontrado):**
```json
{
  "encontrado": false,
  "cliente": null,
  "tiene_deuda": false,
  "saldo_total": 0,
  "facturas": []
}
```

---

### 3.2 Consultar por código de abonado (CU-40)

```
GET /api/deuda-publica/abonado?codigo_abonado=100
```

**Respuesta 200:** Misma estructura que consulta por RUT.

---

## 4. Panel Admin (API Key)

Requieren header `X-API-Key: <ADMIN_API_KEY>`.

### 4.1 Historial de intentos fallidos (RF-06)

```
GET /api/admin/intentos-fallidos?bloqueados=true&ip=192.168.1.50&page=1&limit=20
X-API-Key: finet-admin-key-2026-dev
```

**Query params (todos opcionales):**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `rut` | string | Filtra por RUT (sin puntos ni guión) |
| `ip` | string | Filtra por dirección IP |
| `bloqueados` | `"true"` o `"false"` | Solo con bloqueo activo o inactivos |
| `desde` | string | Fecha inicio (`YYYY-MM-DD`) |
| `hasta` | string | Fecha fin (`YYYY-MM-DD`) |
| `page` | number | Página (default 1) |
| `limit` | number | Por página (default 20, max 100) |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id_intento": "15",
      "rut_intentado": "123456785",
      "ip_address": "192.168.1.50",
      "timestamp": "2026-06-01T14:00:00.000Z",
      "bloqueado_hasta": "2026-06-01T14:15:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### 4.2 Desbloquear IP (RF-06)

```
POST /api/admin/intentos-fallidos/desbloquear-ip
X-API-Key: finet-admin-key-2026-dev
Content-Type: application/json

{ "ip": "192.168.1.50" }
```

**Respuesta 200:**
```json
{
  "desbloqueado": true,
  "registros_afectados": 3
}
```

Si la IP no tiene bloqueos activos:
```json
{
  "desbloqueado": false,
  "registros_afectados": 0
}
```

---

## 5. Mecanismos de autenticación

| Tipo | Cómo se envía | Dónde se usa |
|------|---------------|--------------|
| **Público** | Sin auth | Login, register, recuperación, deuda pública |
| **JWT** | Header `Authorization: Bearer <token>` o cookie `access_token` | Portal, perfil, logout |
| **API Key** | Header `X-API-Key: <valor>` | Admin |

---

## 6. Manejo de errores general

Todas las respuestas de error siguen este formato:

```json
{
  "statusCode": 401,
  "message": "Sesión expirada por inactividad"
}
```

### Códigos frecuentes:

| HTTP | Cuándo ocurre |
|------|---------------|
| 400 | Validación fallida (Zod). Revisar `message` para el campo específico. |
| 401 | No autenticado, token expirado, sesión inactiva, IP/RUT bloqueado. Redirigir a login. |
| 409 | Conflicto (RUT o email duplicado en registro). |
| 429 | Rate limit excedido. Esperar y reintentar. |
| 500 | Error interno del servidor. |

### Regla de oro para el frontend:

**Si recibís 401 con `"Sesión expirada por inactividad"`** → redirigir a login con mensaje "Tu sesión se cerró por inactividad".

**Si recibís 401 con `"Unauthorized"`** → el token JWT es inválido. Limpiar token local, redirigir a login.

**Si recibís 401 en `/api/auth/login`** → no es error de sesión, es error de credenciales. Mostrar el mensaje del body.

---

## 7. Variables de entorno para el frontend

```env
VITE_API_URL=http://localhost:4000/api
```

> El backend ya configura CORS para los orígenes definidos en `CORS_ORIGIN`. Asegurate de que la URL del frontend esté en esa lista.

---

## 8. Flujos completos de ejemplo

### Flujo de login + panel

```javascript
// 1. Login
const loginRes = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rut: '12.345.678-5', password: 'MiClave1' }),
});
const { access_token, cliente } = await loginRes.json();

// 2. Guardar token (localStorage o cookie ya seteada)
localStorage.setItem('token', access_token);

// 3. Cargar panel
const panelRes = await fetch(`${API_URL}/portal/panel`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
const panel = await panelRes.json();

// 4. Si 401 "Sesión expirada" → redirigir a login
if (panelRes.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/login?reason=inactivity';
}
```

### Flujo de recuperación de contraseña

```javascript
// 1. Solicitar recuperación
await fetch(`${API_URL}/auth/recuperar-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rut: '12.345.678-5' }),
});
// Siempre responde 200 con mensaje genérico

// 2. El usuario recibe email, hace clic en el link
// El link lleva a: /restablecer-password?token=eyJhbGciOi...

// 3. Restablecer contraseña
const resetRes = await fetch(`${API_URL}/auth/restablecer-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: new URLSearchParams(window.location.search).get('token'),
    password: 'NuevaClave1',
  }),
});
// Si 200 → mostrar "Contraseña actualizada" y redirigir a login
```
