# Morosidad — Documentación para Frontend

Base URL: `http://localhost:4000/api`

**Requiere autenticación de administrador.** Todos los endpoints van bajo `AdminGuard`, que
hoy valida el header `x-api-key` contra la variable `ADMIN_API_KEY`. Cuando exista el panel
administrativo esto pasa a sesión + rol `ADMIN`, cambiando solo `admin.guard.ts`.

Corresponde al `MorosidadController` del Diagrama de Componentes del Documento 0.

> ⚠️ **Requiere una migración que todavía no está aplicada.** Los endpoints de configuración
> (CU-80) y la revisión de morosidad (CU-47) necesitan la tabla `configuracion_morosidad` y
> la columna `contrato.fecha_morosidad`. Ambas están pendientes de aprobación del equipo,
> porque la base es la global compartida por 4 grupos. Sin ellas responden 500.
>
> Los endpoints de contratos vencidos (CU-55 y CU-56) **sí funcionan** contra la base actual.

---

## 1. Consultar parámetros de morosidad (CU-80)

Devuelve los valores vigentes que usa la revisión diaria de morosidad (CU-47).

```
GET /api/admin/morosidad/configuracion
```

**Headers:**

| Header | Requerido | Descripción |
|--------|-----------|-------------|
| `x-api-key` | Sí | Debe coincidir con `ADMIN_API_KEY` |

**Respuesta 200:**

```json
{
  "dias_gracia": 5,
  "umbral_suspension": 15000,
  "fecha_actualizacion": "2026-08-23T12:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `dias_gracia` | number | Días posteriores a `factura.fecha_limite_pago` antes de marcar el contrato como moroso |
| `umbral_suspension` | number | Monto de deuda que habilita la suspensión del servicio (CU-48) |
| `fecha_actualizacion` | string \| null | ISO 8601 del último cambio |

**Respuesta 401 — sin API key o inválida** (CU-80 Excepción 1):

```json
{ "statusCode": 401, "message": "X-API-Key header is required" }
```

**Respuesta 404 — no hay fila de configuración cargada:**

```json
{
  "statusCode": 404,
  "message": "No hay parámetros de morosidad registrados. Falta cargar la fila inicial de configuracion_morosidad."
}
```

---

## 2. Actualizar parámetros de morosidad (CU-80)

```
PUT /api/admin/morosidad/configuracion
```

**Body:**

```json
{
  "dias_gracia": 10,
  "umbral_suspension": 20000
}
```

| Campo | Tipo | Requerido | Rango permitido |
|-------|------|-----------|-----------------|
| `dias_gracia` | number entero | Sí | 0 a 90 |
| `umbral_suspension` | number | Sí | 0 a 99999999.99 (tope de `DECIMAL(10,2)`) |

**Respuesta 200** — misma forma que el `GET`, con los valores ya actualizados.

**Respuesta 400 — valor fuera de rango** (CU-80 Excepción 2). El mensaje nombra el rango
válido, tal como pide el CU:

```json
{
  "message": "Validation failed",
  "errors": [
    { "path": "dias_gracia", "message": "dias_gracia debe estar entre 0 y 90 días" }
  ]
}
```

Otros mensajes de validación:

| Caso | Mensaje |
|------|---------|
| `dias_gracia` con decimales | `dias_gracia debe ser un número entero, sin decimales` |
| `umbral_suspension` fuera de rango | `umbral_suspension debe estar entre 0 y 99999999.99` |

**Efecto secundario:** cada actualización exitosa escribe una fila en `log_auditoria` con
`accion: 'ACTUALIZAR_CONFIG_MOROSIDAD'`, los valores anterior y nuevo, y la marca de tiempo
en `fecha_hora` — es la poscondición del CU. El campo `id_usuario` queda `null` hasta que
exista sesión de administrador.

---

## 3. Disparar la revisión de morosidad (CU-47 / RF-35)

La revisión corre **sola todos los días a las 00:00** (hora de Chile) por cron: el actor del
CU es el Sistema, no el administrador. Este endpoint existe para poder demostrarla y
probarla sin esperar a medianoche; hace exactamente lo mismo que el cron.

```
POST /api/admin/morosidad/revision
```

Sin body. RF-35: *"identificar contratos cuya deuda supere la fecha de vencimiento más los
días de gracia configurados y marcarlos como morosos"*.

**Respuesta 200** — el log que pide el CU (*"hora de inicio, fin y cantidad de contratos
procesados"*):

```json
{
  "inicio": "2026-08-24T00:00:00.000Z",
  "fin": "2026-08-24T00:00:02.140Z",
  "contratos_procesados": 12,
  "contratos_marcados": 3,
  "contratos_omitidos": 1,
  "ids_marcados": [7, 8, 9],
  "ids_truncados": false
}
```

| Campo | Descripción |
|-------|-------------|
| `contratos_procesados` | Contratos con deuda pendiente que entraron a la revisión |
| `contratos_marcados` | Los que pasaron a moroso **en esta corrida** |
| `contratos_omitidos` | Excepción 2: omitidos por `dia_vencimiento` fuera de 1–28 |
| `ids_marcados` | Muestra de los marcados, acotada a 100 |
| `ids_truncados` | `true` si se marcaron más de los que caben en `ids_marcados` |

**Las tres excepciones no devuelven error**, porque el proceso es automático y debe dejar
registro en vez de reventar. Se distinguen por la fila que queda en `log_auditoria`:

| Excepción del CU | Situación | `accion` en la bitácora | `fallo` |
|---|---|---|---|
| — | corrida normal | `REVISION_MOROSIDAD` | — |
| **1** | el proceso no puede iniciarse: no hay parámetros configurados | `REVISION_MOROSIDAD_FALLIDA` | `SIN_CONFIGURACION` |
| **2** | contratos sin fecha de vencimiento válida | `REVISION_MOROSIDAD` (la corrida sigue) | —, se cuentan en `contratos_omitidos` |
| **3** | falla la consulta masiva de facturas | `REVISION_MOROSIDAD_FALLIDA` | `CONSULTA_FALLIDA` |
| **3** | falla el marcado de contratos | `REVISION_MOROSIDAD_FALLIDA` | `MARCADO_FALLIDO` |

**Idempotente:** un contrato ya marcado no se vuelve a tocar, para conservar la fecha
original desde la que está moroso. Correr el endpoint dos veces seguidas no duplica nada.

---

## 4. Lista de contratos con saldos vencidos (CU-55 / RF-40)

Vista de control de la cartera morosa. RF-40: *"una lista actualizada al momento de entrar o
recargar la página con los contratos que tengan saldos vencidos pendientes de pago"*. La
consulta corre en cada request, sin caché, así que recargar siempre trae el estado actual.

```
GET /api/admin/morosidad/contratos-vencidos?page=1&limit=20
```

| Query param | Tipo | Default | Rango |
|---|---|---|---|
| `page` | number | 1 | ≥ 1 |
| `limit` | number | 20 | 1 a 100 |

**Respuesta 200:**

```json
{
  "data": [
    {
      "id_contrato": 7,
      "rut": "123456785",
      "nombre_completo": "Juan Perez",
      "saldo_vencido": 45000,
      "facturas_vencidas": 3,
      "dias_vencido": 40
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

Solo trae "la información relevante para seguimiento" que pide el CU: a quién cobrar, cuánto
y desde cuándo. El resto (plan, contacto, facturas una por una, historial de pagos) está en
el detalle, CU-56.

**Excepción 3 — sin contratos vencidos:** devuelve `data: []` con `total: 0`, **no** un
error. El frontend muestra ahí la vista vacía con mensaje informativo.

**Excepción 2 — la consulta falla:** 500 con
`"La lista de contratos vencidos no pudo actualizarse."`

**Excepción 1 — sin permisos:** 401 del `AdminGuard`.

---

## 5. Detalle de un contrato vencido (CU-56 / RF-40)

*"el detalle del contrato con la información de deuda, historial de pagos y datos del
cliente"*.

```
GET /api/admin/morosidad/contratos-vencidos/{id}
```

**Respuesta 200:**

```json
{
  "id_contrato": 7,
  "estado": "activo",
  "dia_vencimiento": 5,
  "plan": "Fibra 400 Mbps",
  "cliente": {
    "rut": "123456785",
    "nombre_completo": "Juan Perez",
    "email": "juan@mail.cl",
    "telefono": "+56911111111"
  },
  "saldo_vencido": 20000,
  "facturas": [
    {
      "id_factura": 1,
      "periodo": "07/2026",
      "monto": 20000,
      "fecha_limite_pago": "2026-07-15",
      "estado": "vencida",
      "dias_vencida": 40
    }
  ],
  "historial_pagos": [
    { "id_pago": 9, "monto": 20000, "fecha_pago": "2026-06-10T12:00:00.000Z", "pasarela": "webpay" }
  ]
}
```

- `saldo_vencido` suma solo facturas **impagas** cuya fecha límite ya pasó. Una factura
  pagada no suma aunque su vencimiento sea antiguo.
- `dias_vencida` viene `null` en las facturas pagadas o todavía no vencidas.
- `facturas` trae el historial completo del contrato, no solo las vencidas.

**404** si el contrato no existe. **Excepción 2** (error del sistema): 500 con
`"La información del contrato no está disponible temporalmente."`

---

## Notas de implementación

- **Resolución de empresa:** la configuración se resuelve con `findFirst` porque todavía no
  hay sesión que indique a qué empresa pertenece el administrador. La tabla tiene
  `id_empresa` con índice único, así que cuando el panel lo aporte pasa a
  `findUnique({ where: { id_empresa } })`.
- **`umbral_suspension`** es `DECIMAL(10,2)` en la base y se serializa como `number` en el
  JSON. Se eligió `DECIMAL` y no entero para no castear al comparar contra `factura.monto`,
  que ya es `DECIMAL(10,2)`.
