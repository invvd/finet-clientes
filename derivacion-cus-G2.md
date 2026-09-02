# Casos de uso fuera del alcance del Grupo 2 — derivación a CRM y Terreno

> **Quién lo envía:** Grupo 2 — Interfaz Web (cliente) y Chatbot.
> **Qué es:** de los 80 CU del Documento 0, **18 no son de nuestro alcance**. Este documento
> dice cuáles son, a qué grupo le corresponden y por qué.
> **Documento aparte a propósito:** no es una solicitud de endpoints. Eso va en
> `solicitud-endpoints-G2.md`, que es otra conversación.

## Criterio usado

El campo **Actor(es)** del caso de uso extendido en §14.1 del Documento 0. Nuestro alcance
son los CU cuyo actor es **Cliente**. Los que tienen como actor **Administrador**, **Técnico**
u **Operador** describen trabajo que se hace desde el panel administrativo, desde el portal de
soporte o en terreno — no desde la interfaz web del cliente ni desde el chatbot.

No es una interpretación nuestra: está escrito en el documento, caso por caso.

---

## 1. Corresponden al CRM (12)

| CU | Nombre | Actor | RF | Por qué |
|----|--------|-------|----|---------|
| 06 | Revisando historial de IPs bloqueadas | Administrador | RF-05 | Se opera desde el panel administrativo. El dato es nuestro y ya lo exponemos (`GET /admin/intentos-fallidos`), pero la vista es de ustedes |
| 44 | Registrando pago confirmado con trazabilidad financiera | Sistema, Administrador | RF-32, RF-33 | Registro contable permanente de cada pago. Es núcleo financiero, no interfaz |
| 45 | Validando unicidad de código de transacción | Administrador | RF-33 | Regla de integridad del historial de cobros. Nosotros solo consumimos su código de error |
| 46 | Incorporando abonos de recaudación externa | Sistema, Administrador | RF-34 | Ingesta de reportes de recaudadores externos. No pasa por la web |
| 47 | Identificando contratos morosos en revisión diaria | Sistema, Administrador | RF-35 | Proceso automático que corre cada día a las 00:00. Sin interfaz de usuario |
| 54 | Asignando fecha de vencimiento fija a un contrato | Administrador | RF-39 | RF-39 lo dice literal: *"en el panel administrativo estará habilitada una función para asignar un día numérico del mes"* |
| 55 | Consultando lista de contratos con saldos vencidos | Administrador | RF-40, RF-35 | Vista de control de cobranza |
| 56 | Gestionando seguimiento de contrato vencido | Administrador | RF-40 | Gestión de cartera morosa |
| 57 | Generando reporte financiero del período | Administrador | RF-41 | Reportería de ingresos y deuda global |
| 58 | Descargando reporte financiero generado | Administrador | RF-41, RF-38 | Continuación de CU-57 |
| 79 | Auditando historial de sesiones del asistente | Administrador | RF-47, RF-45 | Los datos son nuestros (conversaciones del bot) y los vamos a exponer, pero la vista de auditoría es del panel administrativo |
| 80 | Configurando parámetros de detección de morosidad | Administrador | RF-35, RF-39 | Configuración que alimenta el CU-47. Panel administrativo |

**El bloque de morosidad va completo.** CU-47, 54, 55, 56 y 80 son una sola cadena: se
configura el umbral (80), se asigna el vencimiento (54), se detecta el moroso (47), se lista
(55) y se le hace seguimiento (56). Partirla entre dos grupos no tiene sentido.

**El núcleo de pago también.** CU-44, 45 y 46 son las tres caras del mismo registro
financiero. Nosotros iniciamos el pago desde la pasarela (CU-42/43) y les entregamos el
resultado, pero el registro contable es de ustedes.

---

## 2. Corresponden a Terreno (6)

### 2.1 Ejecución técnica — actor Técnico (3)

| CU | Nombre | Actor | RF | Por qué |
|----|--------|-------|----|---------|
| 33 | Ejecutando cambio de clave WiFi solicitado por el cliente | **Técnico**, Sistema | RF-25 | Nosotros registramos la solicitud desde el portal (CU-32) y se las dejamos en cola. La ejecución sobre el equipo del cliente es de ustedes |
| 36 | Ejecutando evaluación de red para diagnóstico | **Técnico**, Sistema | RF-26 | El técnico corre la herramienta desde el portal de soporte. Nuestro CU-34 es el cliente corriendo la suya desde la web — son dos flujos distintos con la misma herramienta |
| 78 | Actualizando estado y cerrando ticket de soporte asignado | **Técnico**, Sistema | RF-53, RF-48 | Nosotros creamos el ticket (CU-71 desde el portal, CU-66 desde WhatsApp) y mostramos su estado. Atenderlo y cerrarlo es de ustedes |

### 2.2 SmartOLT — suspensión y reactivación (3)

| CU | Nombre | Actor | RF | Por qué |
|----|--------|-------|----|---------|
| 48 | Suspendiendo servicio por morosidad mediante SmartOLT | Sistema, Administrador | RF-36, RF-35 | Ejecución contra equipamiento de red |
| 50 | Reactivando servicio de cliente suspendido tras pago total | Sistema, Administrador | RF-37, RF-36 | Ídem, con plazo máximo de 1 hora según RF-37 |
| 51 | Registrando bitácora de eventos de suspensión y reactivación | Sistema, Administrador | RF-37 | Traza de las dos operaciones anteriores |

Estos tres son el único bloque de los 80 que el Documento 0 deja sin dueño claro: el actor
dice *Sistema, Administrador*, pero **RF-36 y RF-37 describen instrucciones enviadas a
SmartOLT**, que es la plataforma de gestión de la red. No es trabajo de panel administrativo
ni de interfaz web.

**Van a Terreno** porque son operaciones sobre la planta y el equipamiento, que es el dominio
que ustedes administran. El disparador sí viene del CRM —morosidad detectada (CU-47) y pago
total registrado (CU-44)— pero la ejecución no.

---

## 3. Lo que no está en este documento

**Cuatro CU quedan compartidos**, no derivados: CU-49 y CU-52 con el CRM, CU-70 y CU-77 con
Terreno. En esos la pega está partida —una parte es de ustedes y otra nuestra— y están
detallados en el §3 de `solicitud-endpoints-G2.md`.

**Inventario no aparece.** Ninguno de los 80 CU tiene a Inventario como actor, y ninguno de
nuestros 58 depende de ellos. No hay nada que derivarles ni que pedirles.

---

## Resumen

| Grupo | Cantidad | CU |
|---|---|---|
| **CRM** | 12 | 06, 44, 45, 46, 47, 54, 55, 56, 57, 58, 79, 80 |
| **Terreno** | 6 | 33, 36, 48, 50, 51, 78 |
| Compartidos (ver otro documento) | 4 | 49, 52, 70, 77 |
| **Nuestros** | 58 | el resto |

Si alguno de estos 18 les parece que no les corresponde, díganlo con el criterio que
corresponda —actor del CU, RF asociado, o acuerdo de equipo— y lo revisamos. Lo que no
queremos es que queden sin dueño y nadie los tome.
