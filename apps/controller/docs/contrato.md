# Contrato — Documentación para Frontend

Base URL: `http://localhost:4000/api`

**Requiere autenticación de administrador.** Todos los endpoints van bajo `AdminGuard`, que
hoy valida el header `x-api-key` contra la variable `ADMIN_API_KEY`. Cuando exista el panel
administrativo esto pasa a sesión + rol `ADMIN`, cambiando solo `admin.guard.ts`.

Corresponde al `ContratoController` del Diagrama de Componentes del Documento 0: operaciones
administrativas sobre contratos **que ya existen**. El alta de contratos desde el formulario
web es otra cosa y vive en [`contrataciones`](./api-frontend.md) (endpoint público).

---

## 1. Asignar día de vencimiento fijo (CU-54 / RF-39)

Define el día del mes en que vence el contrato. RF-39: *"asignar un día numérico del mes
como fecha de vencimiento fija por contrato"*.

```
PATCH /api/admin/contratos/{id}/dia-vencimiento
```

**Path params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | `id_contrato`. Si no es numérico, responde 400 |

**Headers:**

| Header | Requerido | Descripción |
|--------|-----------|-------------|
| `x-api-key` | Sí | Debe coincidir con `ADMIN_API_KEY` |

**Body:**

```json
{ "dia_vencimiento": 15 }
```

| Campo | Tipo | Requerido | Rango |
|-------|------|-----------|-------|
| `dia_vencimiento` | number entero | Sí | **1 a 28** |

> El tope de 28 es del CU: *"valida que el valor sea un entero entre 1 y 28 para evitar
> conflictos con meses cortos"*. Un día 29, 30 o 31 no existe en todos los meses, así que el
> vencimiento quedaría indefinido en febrero.

**Respuesta 200:**

```json
{
  "id_contrato": 7,
  "dia_vencimiento": 15
}
```

**Respuesta 400 — día fuera de rango** (CU-54 Excepción 2):

```json
{
  "message": "Validation failed",
  "errors": [
    { "path": "dia_vencimiento", "message": "dia_vencimiento debe estar entre 1 y 28" }
  ]
}
```

| Caso | Mensaje |
|------|---------|
| día 0, negativo, o 29 a 31 | `dia_vencimiento debe estar entre 1 y 28` |
| día con decimales | `dia_vencimiento debe ser un número entero, sin decimales` |
| `dia_vencimiento` ausente o no numérico | `Validation failed` con el detalle en `errors` |

**Respuesta 401 — sin API key o inválida** (CU-54 Excepción 1).

**Respuesta 404 — el contrato no existe.** Corresponde a la precondición del CU
(*"debe existir un contrato válido para configurar"*):

```json
{ "statusCode": 404, "message": "No existe un contrato con id 999." }
```

**Respuesta 500 — error al guardar** (CU-54 Excepción 3):

```json
{ "statusCode": 500, "message": "No fue posible registrar el vencimiento." }
```

---

## Notas de implementación

- **Sin migración.** `contrato.dia_vencimiento` ya existía en el schema (`SMALLINT NOT NULL`)
  desde antes de este bloque. Este CU solo agrega el endpoint y la validación de rango.
- **Bitácora:** cada cambio exitoso escribe en `log_auditoria` con
  `accion: 'ASIGNAR_DIA_VENCIMIENTO'`, el día anterior y el nuevo. Mismo patrón que
  `AdminService.desbloquearIp` y `MorosidadService.actualizarConfiguracion`. El campo
  `id_usuario` queda `null` hasta que exista sesión de administrador.
- **Quién lo consume:** la revisión diaria de morosidad (CU-47) usa este día junto con
  `dias_gracia` del propio contrato (ver [morosidad](./morosidad.md)) para decidir qué contratos
  quedan morosos.
