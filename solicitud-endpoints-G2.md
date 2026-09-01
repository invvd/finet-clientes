# Solicitud de endpoints para integración — Interfaz Web y Chatbot (G2) → CRM / Terreno

> **Quién pide:** Grupo 2 — sitio público, Portal Cliente, autogestión y asistente virtual.
> **Para qué:** implementar los 40 CU de nuestro alcance que consumen o publican datos de
> otros dominios, sobre un total de 58 CU propios.
> **Acuerdo de base:** los 4 sistemas NO comparten tablas. Toda integración es por API REST
> (JSON). No consultaremos directamente su base de datos; pedimos endpoints.

---

## 0. Formato general

Adoptamos íntegro el formato que propuso T1: respuestas `{ "success", "data", "message" }`,
errores con código HTTP correcto (400/403/404), header `X-API-KEY` por grupo, y filtro por
`id_empresa` (1 = Finet, 2 = Cable Mágico) donde aplique.

Cada campo cita la tabla del Documento 0 que lo define (§11.1 a §11.15). Donde el Documento 0
**no** lo define, va marcado ⚠️ y detallado en `definiciones-pendientes-G2.md`, que circulamos
por separado. No inventamos estructura.

El asistente opera sobre **WhatsApp**, no como widget web. Por eso CU-63 pide el RUT al inicio
de la conversación —no hay sesión que identifique al cliente— y por eso el canal por defecto
de las notificaciones es WhatsApp.

---

## 1. Solicitudes al Grupo CRM

26 CU nuestros. Sin estos endpoints el sitio público queda sin catálogo y el Portal Cliente
queda vacío.

### 1.1 — CU-01, 03, 04, 07, 63: cliente por RUT

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /clientes/rut/{rut}` |
| Formato del RUT | §11.1 — en BD sin puntos ni guión (`123456785`), DV 0-9 o K |
| Datos | `id_cliente`, `rut`, `nombre_completo` (§11.1), `telefono` (§11.2, `+56945002319`), `email` (§11.2, minúsculas), `estado`, `id_empresa` |
| Caso no encontrado | 404 con mensaje claro |

Es el endpoint que más CU sostiene: **CU-01** valida que el RUT tenga servicio antes de crear
sesión · **CU-04** verifica que no exista cuenta previa · **CU-03** recupera el correo para el
enlace de recuperación · **CU-07** muestra la ficha (RF-06) · **CU-63** valida el RUT que el
cliente escribe en WhatsApp. Ojo que CU-03 exige **no revelar si el RUT existe**: nosotros
unificamos el mensaje al usuario, solo necesitamos distinguir el caso internamente.

### 1.2 — CU-08, 09: actualizar teléfono y correo

| Ítem | Detalle |
|------|---------|
| Endpoint | `PATCH /clientes/{id_cliente}` — **por construir** |
| Cuerpo | `telefono` y/o `email` (§11.2) |
| Auditoría | CU-08/09 exigen log inmutable con ID de usuario, campo modificado y fecha (§11.4). Definir si lo lleva el CRM, nosotros, o ambos |

RF-07 permite actualizarlos desde Perfil previa validación de la contraseña actual (esa parte
es nuestra). **Es el único punto donde escribimos sobre su ficha**, y por eso importa acordar
el dueño del campo: si el dato queda solo de nuestro lado, ustedes cobran y notifican con
información desactualizada.

### 1.3 — CU-15, 17, 19, 38, 72, 74: catálogo de planes

| Ítem | Detalle |
|------|---------|
| Endpoints | `GET /planes` y `GET /planes/{id_plan}` |
| Query params | `segmento` ⚠️, `id_empresa` |
| Datos | `id_plan`, `nombre` (§11.6, `Fibra 400 Mbps`), `velocidad` (entero Mbps), `precio` (§11.5, entero CLP), `tipo_plan` (§11.15, `FIBRA\|TV\|DUO`), `canales_tv`, `caracteristicas`, `segmento`, `vigente` |

Alimenta las tarjetas de plan (RF-15) en desktop y móvil, la sección corporativa (RF-17), y
también el SEO: CU-72 genera meta tags por plan y CU-74 enumera esas rutas para el sitemap —
por eso necesitamos un identificador de plan estable, no solo el nombre.

> ⚠️ El selector "Personas"/"Empresas" de RF-13 no tiene enum en §11.15. Proponemos
> `PERSONAS | EMPRESAS`; ver definición pendiente n.º 4.

### 1.4 — CU-18, 75: lead de solicitud de contratación

| Ítem | Detalle |
|------|---------|
| Endpoint | `POST /leads` |
| Cuerpo | `id_plan`, contacto (§11.2), dirección (§11.3), `canal_origen = WEB` (§11.15), `empresa_destino` (§11.15), etapa `NUEVO`, `acepta_politicas`, `fecha_aceptacion` |
| Respuesta | `id_lead` en formato `LD-XXXXXXX` (§11.10), para darle seguimiento al cliente |

El botón "Contratar ahora" (RF-16) lleva al formulario. La aceptación de políticas viaja en el
mismo POST porque RF-59 obliga a registrarla **junto con** los datos capturados, no aparte.
**Pregunta abierta:** ¿el lead lo toma el CRM directo o pasa a Terreno para agendar la visita
de factibilidad? La etapa `FACTIBILIDAD` del pipeline (§11.10) sugiere un traspaso.

### 1.5 — CU-23, 24, 25, 26, 32, 64: contratos y estado operativo

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /contratos?rut={rut}` |
| Datos | `id_contrato`, `numero_contrato` (§11.7, `00142-2026`), `estado` ⚠️, `id_plan`, `nombre_plan` (§11.6), `fecha_inicio`, `dia_vencimiento` (día del mes, RF-39), `direccion_servicio` |
| Respuesta | **Siempre lista**, aunque traiga un solo elemento — CU-26 contempla clientes con más de un plan vigente (RF-21) |

Sostiene el panel principal completo: indicador de estado (CU-23, RF-20), vista consolidada
(CU-24), nombre comercial de los planes (CU-25/26), verificación de plan Activo antes de
aceptar un cambio de clave WiFi (CU-32, RF-25) y la respuesta del bot (CU-64, RF-46).

> ⚠️ `estado` está definido de tres formas distintas en el Documento 0: §11.6 con 4 valores,
> §11.15 con 6, y RF-20/CU-23 con 3 en español. Lo renderizamos como indicador visible, así
> que si llega `CORTADO` o `REACTIVADO` la UI no los tiene y falla en silencio. **Es la más
> urgente de cerrar**; ver definición pendiente n.º 1.

### 1.6 — CU-27, 28, 39, 40, 41, 64: deuda y ciclo de facturación

| Ítem | Detalle |
|------|---------|
| Endpoints | `GET /deuda?rut={rut}` y `GET /deuda?codigo_abonado={codigo}` ⚠️ |
| Datos | `saldo_total` (§11.5, entero CLP), `fecha_vencimiento_ciclo` (§11.4), `documentos[] { id_documento, folio, monto, concepto, fecha_emision, fecha_vencimiento, estado }` |
| Caso sin deuda | 200 con `saldo_total: 0` y lista vacía — CU-27 despliega el mensaje de RF-22 |
| Dato extra pedido | Que `documentos[]` incluya **`concepto`**, para desglosar el recargo de reconexión de CU-49 (ver §3) en vez de fundirlo en el total |

> ⚠️ **Sin autenticación.** CU-39, 40 y 41 son consulta pública sin login (RF-29): hay que
> acordar rate limiting y qué se expone — hoy mostramos monto y vencimiento, no el nombre.
>
> ⚠️ `codigo_abonado` no está definido en §11.13 ni §11.7. Si resulta ser el N° de contrato,
> CU-39 y CU-40 se resuelven con **un endpoint de dos claves** en vez de dos; ver n.º 3.

### 1.7 — CU-42, 43: pago en línea

| Ítem | Detalle |
|------|---------|
| Qué consumimos | El monto del ciclo activo (§1.6) antes de abrir la pasarela |
| Qué publicamos | `POST /pagos/confirmar` hacia su CU-44: `codigo_abonado`, `monto`, `codigo_transaccion`, `medio_pago`, `fecha` |
| Estados a devolver | Aprobada, rechazada o cancelada — las tres poscondiciones de CU-42/43 |

RF-31 permite Webpay y Mercado Pago contra la misma interfaz, así que el contrato es uno solo.
La validación de transacciones duplicadas es **suya** (RF-33, su CU-45): no la duplicamos,
solo necesitamos el código de error para informarle al cliente.

### 1.8 — CU-52, 53: comprobante de pago

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /pagos/{id_pago}/comprobante` — **por construir** |
| Respuesta | PDF, o URL firmada con expiración |

Ustedes lo generan al confirmarse la transacción (RF-38, bajo 500 KB); nosotros lo exponemos
para descarga en el portal y lo adjuntamos al correo de CU-53.

### 1.9 — CU-67, 68, 69: webhook de notificaciones

Estos tres CU **no pueden existir sin que el CRM emita el evento**: somos el canal de salida
hacia WhatsApp y correo, no tenemos cómo detectar un vencimiento ni un pago por nuestra cuenta.

| Ítem | Detalle |
|------|---------|
| Qué pedimos | `POST {API_G2}/api/integraciones/notificaciones` desde su backend |
| Alternativa | Si prefieren no llamarnos, expongan `GET /eventos-pendientes` y lo consultamos |

```json
{
  "tipo": "VENCIMIENTO_PROXIMO | CORTE_INMINENTE | PAGO_REGISTRADO",
  "rut": "123456785",
  "codigo_abonado": "00142-2026",
  "datos": { "monto": 15500, "fecha_vencimiento": "2026-09-15", "enlace_pago": "https://..." }
}
```

| Nuestro CU | Evento | Origen en su lado | RF |
|---|---|---|---|
| CU-67 | Ciclo vence en 3 días | Su CU-54 | RF-49 |
| CU-68 | Umbral de morosidad alcanzado | Su CU-47 / CU-80 | RF-50 |
| CU-69 | Pago registrado | Su CU-44 | RF-51 |

`enlace_pago` solo aplica a `CORTE_INMINENTE` (RF-50 exige adjuntar el enlace a la pasarela).
Necesitamos saber si lo generan ustedes o lo construimos nosotros.

---

## 2. Solicitudes al Grupo Terreno

7 CU nuestros. El dominio de tickets es de ustedes; nosotros somos el canal de entrada del
cliente (portal y WhatsApp) y la vista de seguimiento.

### 2.1 — CU-29, 30: historial de tickets del cliente

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /tickets?rut={rut}` |
| Datos | `id_ticket` **y** `codigo_seguimiento` ⚠️, `estado` (§11.15, `ABIERTO\|EN_PROGRESO\|ESCALADO\|RESUELTO\|CERRADO`), `prioridad` (§11.15), `categoria` (§11.9), `fecha_creacion`, `descripcion` |
| Caso sin datos | 200 con lista vacía — CU-29 es exactamente ese estado vacío (RF-23) |

> ⚠️ Pedimos **los dos códigos** porque el Documento 0 los define incompatibles: §11.8 dice
> correlativo `TK-0001542` y RF-53 dice tipo + `AAMMDD` + aleatorio. Nuestra lectura es que no
> es contradicción sino dos campos distintos, uno interno y uno público; ver n.º 2.

### 2.2 — CU-66, 71: catálogo de categorías de falla

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /tickets/categorias` |
| Datos | `codigo`, `nombre`, `subcategorias[]`, `sla_target` — §11.9 ya lo define completo (`CAT-01` a `CAT-07`) |

RF-53 exige que el formulario del portal ofrezca una categoría predefinida, y CU-66 que el bot
las presente en WhatsApp. Preferimos consumirlo antes que hardcodearlo. **¿El catálogo de
§11.9 sigue vigente o lo ampliaron?**

### 2.3 — CU-66, 71, 77: crear ticket desde portal y WhatsApp

| Ítem | Detalle |
|------|---------|
| Endpoint | `POST /tickets` |
| Cuerpo | `rut`, `categoria`, `descripcion`, `canal`, `historial_conversacion` (solo CU-77) |
| `canal` | `PORTAL` (CU-71) o `WHATSAPP` (CU-66), para que puedan medir por dónde entran |
| Respuesta | `codigo_seguimiento` — CU-71 y CU-66 deben mostrárselo al cliente |

La validación de descripción mínima (RF-53, §11.14) la aplicamos nosotros antes de enviar.
`historial_conversacion` evita inventar un segundo endpoint para CU-77.

### 2.4 — CU-32 → su CU-33: cola de solicitudes de cambio de clave WiFi

**Dirección inversa: nosotros exponemos, ustedes consumen.**

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET {API_G2}/solicitudes-wifi?estado=PENDIENTE` |
| Datos | `id_solicitud`, `rut`, `numero_contrato`, `clave_nueva`, `fecha_solicitud` |
| Qué necesitamos de vuelta | Que marquen la solicitud como ejecutada, para notificar al cliente (poscondición de su CU-33) |

RF-25 permite crear la solicitud mientras el plan esté Activo; la clave ya viene validada como
alfanumérica (RF-24, nuestro CU-31). La ejecución sobre el equipo es su CU-33, actor Técnico.

### 2.5 — CU-59 a 62: datos de cobertura

Ver §3 — es trabajo conjunto, no una solicitud.

---

## 3. Casos de uso de trabajo conjunto

| CU | Ellos hacen | Nosotros hacemos | Qué falta acordar |
|---|---|---|---|
| **49** Recargo de reconexión | CRM lo aplica al saldo (RF-36) | Lo mostramos en el portal | Que `documentos[]` traiga `concepto` (§1.6). Si la deuda sube sin explicación visible, entra un ticket |
| **52** Comprobante PDF | CRM lo genera del pago (RF-38) | Lo exponemos y adjuntamos en CU-53 | El endpoint de §1.8 |
| **70** Derivar a operador | Terreno atiende | El bot detecta y traspasa el contexto (RF-52) | Cómo se entrega una conversación de WhatsApp en curso: ¿cola de operadores?, ¿responden desde su panel o desde WhatsApp? **Es lo menos definido del proyecto** |
| **59-62** Visor de cobertura | Terreno tiene la planta externa | El visor va en nuestro panel | Ver abajo |

**Sobre la cobertura.** RF-43 pide una capa de calor donde la intensidad representa la densidad
de cobertura por zona, pero §11 no define ningún campo geográfico — lo más cercano, §11.7
(*Puerto OLT*) y §11.3 (*Direcciones*), es otra cosa. El insumo existe pero en la sección de
contexto: §1.1.1 describe cajas NAP en postes a 16 clientes por caja. Proponemos definir juntos
una tabla (zona, comuna, lat/long, capacidad total y ocupada, densidad) y decidir si la
densidad la calculan ustedes o nos pasan la ocupación cruda. **Solo CU-60 depende de este
dato** — CU-59, 61 y 62 son frontend sobre los tiles y los avanzamos sin bloqueo.

---

## 4. Lo que G2 ofrece a cambio

| Endpoint | Nuestro CU | Estado | Quién lo consume |
|---|---|---|---|
| `GET /admin/intentos-fallidos` — IPs bloqueadas, con filtros y paginado | CU-06 | **Ya implementado** | CRM (panel admin) |
| Historial de sesiones del asistente, con filtros por fecha, tipo y resultado | CU-79 | Por construir | CRM (auditoría) |
| `GET /solicitudes-wifi?estado=PENDIENTE` | CU-32 | Por construir | Terreno (su CU-33) |
| Registro de aceptación de políticas con marca de tiempo (RF-59) | CU-75 | Por construir | CRM (trazabilidad legal) |

Si necesitan algo más de nuestro lado, pídanlo y lo agregamos.

---

## 5. Resumen de lo que pedimos (checklist)

| # | Grupo | Endpoint | Estado actual | Para nuestro CU |
|---|-------|----------|---------------|-----------------|
| 1 | CRM | `GET /clientes/rut/{rut}` | Por confirmar | 01, 03, 04, 07, 63 |
| 2 | CRM | `PATCH /clientes/{id_cliente}` | **Por construir** | 08, 09 |
| 3 | CRM | `GET /planes` + `/planes/{id}` | Por confirmar | 15, 17, 19, 38, 72, 74 |
| 4 | CRM | `POST /leads` con canal origen `WEB` | Por confirmar | 18, 75 |
| 5 | CRM | `GET /contratos?rut=` con estado y plan | Por confirmar | 23, 24, 25, 26, 32, 64 |
| 6 | CRM | `GET /deuda?rut=` / `?codigo_abonado=` con `concepto` | Por confirmar | 27, 28, 39, 40, 41, 64 |
| 7 | CRM | `POST /pagos/confirmar` | Por confirmar | 42, 43 |
| 8 | CRM | `GET /pagos/{id}/comprobante` | **Por construir** | 52, 53 |
| 9 | CRM | Webhook `POST /api/integraciones/notificaciones` | **Por construir** | 67, 68, 69 |
| 10 | Terreno | `GET /tickets?rut=` con ambos códigos | Por confirmar | 29, 30 |
| 11 | Terreno | `GET /tickets/categorias` | Por confirmar | 66, 71 |
| 12 | Terreno | `POST /tickets` con `canal` e historial | Por confirmar | 66, 71, 77 |
| 13 | Terreno | Consumo de nuestra cola WiFi + callback | **Por construir** | 32 |
| 14 | Terreno | Derivación de conversación a operador | **Por definir** | 70 |
| 15 | Terreno | Estructura de datos de cobertura | **En conjunto** | 59, 60, 61, 62 |

> **Prioridad.** Los ítems **1, 5 y 6** son los bloqueantes serios: sin ficha de cliente no hay
> autenticación ni perfil, y sin contrato ni deuda el Portal Cliente queda vacío. El **9**
> bloquea por completo CU-67, 68 y 69. Los ítems 3, 4, 10, 11 y 12 son lecturas o escrituras
> simples que probablemente ya existen y solo hay que confirmar; los 14 y 15 necesitan una
> conversación de diseño antes de poder especificarse.
>
> **Antes de implementar los ítems 5, 6 y 10** hay que cerrar tres inconsistencias del
> Documento 0 (estado de servicio, código de abonado y código de ticket), detalladas en
> `definiciones-pendientes-G2.md`.
