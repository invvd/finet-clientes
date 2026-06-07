# Landing Page — Documentacion para Frontend

Base URL: `http://localhost:4000/api`

**Publico** — no requiere autenticacion.

---

## 1. Catalogo de planes (CU-15 / CU-17)

**CU-15:** Filtrar catalogo por segmento (`tipo_cliente`).
**CU-17:** Consultar detalles tecnicos y comerciales de cada plan — el visitante ve nombre comercial, velocidad, precio mensual y caracteristicas en las tarjetas desplegadas.

Devuelve todos los planes activos disponibles para mostrar en la landing page. Se puede filtrar por tipo de cliente.

```
GET /api/landing/planes
GET /api/landing/planes?tipo_cliente=residencial
```

**Query params:**

| Param | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `tipo_cliente` | string | No | Filtra por tipo. Valores tipicos: `residencial`, `empresarial`. Si se omite, devuelve todos. |

**Respuesta 200:**

```json
[
  {
    "id_plan": 1,
    "nombre_comercial": "Fibra 100 Megas",
    "tipo_plan": "fibra",
    "tipo_cliente": "residencial",
    "velocidad_mbps": 100,
    "precio_mensual": 14990,
    "descripcion": "Internet fibra optica 100 Mbps ideal para streaming y teletrabajo"
  },
  {
    "id_plan": 2,
    "nombre_comercial": "Fibra 600 Megas",
    "tipo_plan": "fibra",
    "tipo_cliente": "residencial",
    "velocidad_mbps": 600,
    "precio_mensual": 19990,
    "descripcion": "Internet fibra optica 600 Mbps para gaming y multiples dispositivos"
  }
]
```

Los planes se devuelven ordenados por `precio_mensual` ascendente (del mas barato al mas caro).

Solo se incluyen planes con `activo: true`. Planes inactivos no aparecen.

**Campos:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id_plan` | number | ID del plan |
| `nombre_comercial` | string | Nombre comercial del plan |
| `tipo_plan` | string | Categoria del plan (ej: `fibra`, `inalambrico`) |
| `tipo_cliente` | string | Segmento (ej: `residencial`, `empresarial`) |
| `velocidad_mbps` | number \| null | Velocidad en Mbps. `null` si no aplica |
| `precio_mensual` | number | Precio mensual en pesos |
| `descripcion` | string \| null | Descripcion comercial. `null` si no tiene |

**Errores:**

| HTTP | Mensaje | Causa |
|------|---------|-------|
| 400 | `"Validation failed"` | `tipo_cliente` excede 20 caracteres |
| 404 | `"No hay planes disponibles para este segmento"` | Segmento sin planes activos (CU-15 Excepcion 2) |
| 500 | `"La seccion Planes no esta disponible temporalmente"` | Error interno al consultar la base de datos (CU-15 Excepcion 1 / CU-17 Excepcion 1) |

---

[Volver al indice](./api-frontend.md)
