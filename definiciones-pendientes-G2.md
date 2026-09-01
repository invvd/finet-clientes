# Definiciones pendientes del Documento 0 — detectadas por G2

> **Documento interno del Grupo 2.** No circular con la solicitud de endpoints: esto no son
> peticiones, son inconsistencias y vacíos de la fuente que hay que cerrar en equipo antes de
> que cada grupo implemente por su cuenta.
>
> Detectadas revisando el Documento 0 REV1 completo: §11.1–11.15 (estructuras y enums),
> §13.1 (los 59 RF) y §14.1 (los 80 CU extendidos).

---

## 1. `Estado servicio` tiene tres definiciones — **urgencia alta**

**Dónde:** Tabla 11.6 → 4 valores (`ACTIVO|SUSPENDIDO|CORTADO|BAJA`) · Tabla 11.15 → 6
(agrega `PENDIENTE|REACTIVADO`) · RF-20 y CU-23 → 3, en español (`"Activo"|"En Trámite"|"Suspendido"`).

**Por qué:** §11.15 es la consolidación posterior y agregó los dos valores del ciclo de
suspensión/reactivación (RF-36/37). RF-20 y CU-23 se escribieron desde la UI —qué ve el
cliente— sin volver a §11.15. Es una etiqueta de presentación escrita como si fuera el dominio.

**Propuesta: editar CU-23 y RF-20 para que respeten la Tabla 11.15.** La tabla manda; el CU
está mal, no al revés. Reescribir RF-20 como "según los valores definidos en la Tabla 11.15",
ampliar la validación de CU-23 a los 6 valores, y corregir §11.6 para que remita a §11.15.
Texto visible propuesto: `ACTIVO`/`REACTIVADO` → "Activo" · `PENDIENTE` → "En trámite" ·
`SUSPENDIDO` → "Suspendido" · `CORTADO` → "Cortado" · `BAJA` → "De baja".

**Con:** BD + CRM. **Bloquea:** CU-23, 24, 32, 64. Lo renderizamos como indicador visible; si
llega `CORTADO` o `REACTIVADO`, la UI no los tiene y falla en silencio.

---

## 2. El código de ticket tiene dos formatos — **urgencia media**

**Dónde:** Tabla 11.8 y 11.13 → `TK-XXXXXXX`, correlativo de 7 dígitos con padding ·
RF-53 → "tipo abreviado + `AAMMDD` + combinación alfanumérica aleatoria".

**Por qué:** no es contradicción, son **dos campos fusionados en uno**. §11.8 es el ID interno
de la entidad (patrón de PK visible del CRM, igual que `CL-`, `LD-`, `AC-`). RF-53 es un código
público, y es aleatorio a propósito: un correlativo secuencial deja enumerar tickets ajenos.

**Propuesta: separarlos.** `id_ticket` (`TK-XXXXXXX`, interno) y `codigo_seguimiento`
(tipo + `AAMMDD` + aleatorio, ej. `SOP-260901-A7K2`, el que mostramos en CU-30 y CU-71).
Agregar la segunda fila a §11.8, precisar en RF-53 el largo y alfabeto de la parte aleatoria,
y que `GET /tickets` devuelva ambos.

**Con:** BD + Terreno. **Bloquea:** CU-30, 71.

---

## 3. "Código de abonado" no existe en el modelo — **urgencia alta**

**Dónde:** exigido por RF-29 y CU-40 · ausente de Tabla 11.13 (que define `CL-`, `LD-`, `TK-`,
`AC-`, `OP-`, `IN-` y contrato `XXXXX-AAAA`) y de Tabla 11.7 (que sí tiene *N° contrato*
`00142-2026`).

**Por qué:** es terminología operativa del negocio —así le dicen al identificador que el
cliente ve en su boleta— mientras que §11.13 se escribió desde el modelo de datos del CRM.
Nadie hizo el puente entre el término del negocio y el campo del sistema.

**Propuesta: incorporar el valor a la Tabla 11.13** con prefijo y formato, y referenciarlo
desde RF-29 y CU-40. Antes hay que responder una pregunta que cambia el trabajo: **si es el
N° de contrato de §11.7**, no hay campo nuevo y CU-39/CU-40 se resuelven con un endpoint de dos
claves en vez de dos endpoints. Si es un identificador aparte, hay que definir formato y quién
lo genera.

**Con:** CRM + BD. **Bloquea:** CU-40 por completo; CU-39 y CU-41 usan el mismo endpoint.

---

## 4. El segmento del catálogo no tiene enum — **urgencia media**

**Dónde:** RF-13 y CU-15 exigen un selector "Personas"/"Empresas" · Tabla 11.6 solo tiene
*Tipo de plan* (`FIBRA|TV|DUO`) · §11.15 no lo tiene.

**Por qué:** §11.6 modeló el plan por **tecnología** (qué se entrega), no por **segmento
comercial** (a quién se vende). Dos ejes, uno sin documentar. Probablemente pasó desapercibido
porque §11.10 tiene *Empresa destino* (`FINET|CABLE_MAGICO`), que parece cubrirlo pero es la
marca, no el segmento.

**Propuesta:** agregar `Segmento plan | PERSONAS | EMPRESAS` a §11.15 y su fila a §11.6. Los
valores calzan literal con las etiquetas de RF-13, así no hace falta tabla de traducción. Si
el CRM prefiere `HOGAR|EMPRESA` da lo mismo — solo necesitamos que sea uno y esté escrito.

**Con:** CRM + BD. **Bloquea:** CU-15, 38. CU-17, 19 y 72 lo usan indirectamente.

---

## 5. Los datos de cobertura no tienen estructura — **urgencia baja**

**Dónde:** RF-42/43/44 y CU-59–62 los exigen · §11 no tiene **ninguna** tabla geoespacial (lo
más cercano, §11.7 *Puerto OLT* y §11.3 *Direcciones*, es otra cosa).

**Por qué:** §11 se armó alrededor de las entidades transaccionales del CRM. El visor es la
única funcionalidad sin entidad dueña, y la única cuya fuente es un **derivado** —cuántas
cajas NAP hay por zona y qué tan ocupadas están—, no un registro que alguien capture. El
insumo está en §1.1.1 (NAP en postes, 16 clientes por caja), pero en la sección de contexto.

**Propuesta: trabajo conjunto con Terreno, no derivación.** El visor se muestra en nuestro
panel (CU-59–62 son nuestros), el dato sale de su planta externa. Tabla a acordar: zona,
comuna (§11.3), lat/long, capacidad total y ocupada, densidad, tipo. A decidir: si la densidad
la calculan ellos o nos pasan la ocupación cruda.

**Con:** Terreno + BD. **Bloquea solo CU-60** — CU-59, 61 y 62 (visor, zoom, paneo) son
frontend puro sobre los tiles y avanzan sin esperar.

---

## 6. Los canales de contacto no tienen enum — **urgencia media**

**Dónde:** RF-49/50/51 y CU-67/68/69 despachan a "los canales de contacto del cliente" ·
Tabla 11.2 define los *formatos* (móvil, fijo, email, WhatsApp) pero no un enum de canal ·
*Canal origen* de §11.10 es de dónde vino el lead, no por dónde se notifica.

**Por qué:** §11.2 asumió que tener el dato equivale a poder notificar por ahí. Notificar
necesita además consentimiento y orden de preferencia — un modelo que nadie levantó.

**Propuesta:** el canal principal es **WhatsApp**. Es coherente con todo el documento: el
asistente corre sobre WhatsApp, el bloque §13.1 1.9 se titula "Chatbot, Notificaciones y
WhatsApp", y §1.1.1 dice que hoy el 90% de la operación ya pasa por ahí. Agregar
`Canal notificacion | WHATSAPP | EMAIL` a §11.15, con WhatsApp por defecto y correo como
respaldo. El consentimiento **no hay que inventarlo**: RF-59/CU-75 ya obliga a registrar la
aceptación de políticas en los formularios, y ese CU es nuestro.

**Con:** BD (solo el enum). **Afecta:** CU-67, 68, 69 — que igual están bloqueados por el
webhook del CRM.

---

## Para la reunión

| # | Tema | Propuesta | Con | Urgencia |
|---|---|---|---|---|
| 1 | `Estado servicio` | Editar CU-23 y RF-20 para respetar la Tabla 11.15 | BD + CRM | **Alta** |
| 2 | Código de ticket | Separar `id_ticket` y `codigo_seguimiento` | BD + Terreno | Media |
| 3 | Código de abonado | Incorporarlo a la Tabla 11.13; confirmar si es el N° de contrato | CRM + BD | **Alta** |
| 4 | Segmento del catálogo | `Segmento plan: PERSONAS \| EMPRESAS` en §11.15 | CRM + BD | Media |
| 5 | Datos de cobertura | Definir tabla en conjunto; solo bloquea CU-60 | Terreno + BD | Baja |
| 6 | Canal de notificación | `WHATSAPP \| EMAIL`, WhatsApp por defecto | BD | Media |

Los **1 y 3** hay que cerrarlos antes de pedirle endpoints al CRM: sin ellos, `GET /contratos`,
`GET /deuda` y `GET /tickets` se especifican mal y hay que rehacerlos.
Los **2, 4 y 6** son agregados a tablas que ya existen — no cambian el diseño de nadie, solo
escriben lo que ya se asume implícito.
El **5** es el único que necesita diseño nuevo, y no bloquea el incremento.
