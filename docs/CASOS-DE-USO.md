# Glosario de Casos de Uso (CU) y Requisitos Funcionales (RF)

Este proyecto referencia constantemente `CU-XX` (Caso de Uso) y `RF-XX` (Requisito Funcional) en código, tests, docs y mensajes de commit — pero **no hay un documento de requisitos original en este repositorio**. Esta tabla se reconstruyó leyendo `apps/controller/docs/*.md` y el historial completo de commits (`git log --all`), no es una fuente oficial. Si existe un documento de requisitos fuera del repo (Notion, Drive, etc.), esa es la fuente de verdad — actualizar este archivo para enlazarlo.

Las entradas marcadas **⚠ sin confirmar** no tienen descripción en ningún doc ni commit encontrado — no se inventó contenido para ellas.

## Casos de Uso (CU)

| CU | Descripción | Estado | Referencias |
|---|---|---|---|
| CU-01 | Login con RUT + contraseña → sesión y redirect al Portal | ✅ Implementado | RF-01 · `apps/controller/docs/auth.md` |
| CU-02 | Cerrar sesión (logout). Excepción 1: error de conexión, permite reintentar | ✅ Implementado | RF-02 · `auth.md` |
| CU-03 | Recuperar contraseña: RUT → enlace por email (expira 15 min) → nueva clave | ✅ Implementado | RF-03, RF-09 · `auth.md` |
| CU-04 | Tras registro exitoso, auto-login y acceso directo al Portal | ✅ Implementado | RF-10 · commit `cb66112` |
| CU-05 | ⚠ sin confirmar | — | Agrupado con CU-02/06/23 en commit de tests (`21bf2ee`), sin intent propio |
| CU-06 | ⚠ sin confirmar | — | Idem CU-05 |
| CU-07 | Obtener datos del perfil del cliente autenticado | ✅ Implementado | `apps/controller/docs/perfil.md` |
| CU-08 | Actualizar teléfono (requiere contraseña actual, queda en log de auditoría) | ✅ Implementado | `perfil.md` |
| CU-09 | Actualizar email (requiere contraseña actual, rechaza duplicado, auditoría) | ✅ Implementado | `perfil.md` |
| CU-10 | Cambiar contraseña (doble confirmación, auditoría) | ✅ Implementado | `perfil.md` |
| CU-11 | Reglas de complejidad de la nueva contraseña (mín. 8 + mayúscula + número) | ✅ Implementado | RF-09 · `perfil.md` |
| CU-12 | Cierre de sesión automático tras 15 min de inactividad (ventana deslizante) | ✅ Implementado | RF-07 · `auth-feature.md` |
| CU-13 | Navbar | ✅ Implementado | commit `b7410752` (batch navbar/footer/dark-mode) |
| CU-14 | Acceso al Portal con un clic desde navbar/sidebar | ✅ Implementado | commits `23692d1`, `3af93d9` |
| CU-15 | Landing: filtrar catálogo de planes por segmento (`tipo_cliente`) | ✅ Implementado | `apps/controller/docs/landing.md` |
| CU-16 | ⚠ sin confirmar | — | No encontrado en docs ni commits |
| CU-17 | Landing: detalle técnico/comercial de cada plan | ✅ Implementado | `landing.md` |
| CU-18 | Contratación de un plan (módulo `contrataciones`, ruta `/contratar/[planId]`) | ✅ Implementado | Sin doc dedicado — ver hueco anotado abajo |
| CU-19 | ⚠ sin confirmar | — | No encontrado en docs ni commits |
| CU-20 | Modo oscuro / claro | ✅ Implementado | commit `b7410752` |
| CU-21 | Fixes de footer/sidebar (mismo batch que CU-13/14/20/22) | ✅ Implementado | commit `b95ce83` |
| CU-22 | ⚠ sin desglose propio — mencionado junto a CU-13/14/20/21 | — | commit `b7410752` |
| CU-23 | Estado operativo de todos los contratos del cliente | ✅ Implementado | `apps/controller/docs/portal.md` §2 |
| CU-24 | Panel principal unificado (cliente + contratos + deuda + tickets). Excepción 2: mensaje amigable si falla una sub-consulta | ✅ Implementado | `portal.md` §1 |
| CU-25 | Vista de plan único (1 contrato vigente) | ✅ Implementado | `portal.md` §3 |
| CU-26 | Vista de múltiples planes (2+ contratos). Excepción 2: mensaje amigable si falla la recuperación de planes | ✅ Implementado | `portal.md` §3 |
| CU-27 | Estado de deuda: cuenta al día. Excepción 3: saldo no confirmado | ✅ Implementado | `portal.md` §4 |
| CU-28 | Estado de deuda: con deuda — saldo total, facturas, fecha de vencimiento más próxima | ✅ Implementado | `portal.md` §4 |
| CU-29 | Historial de tickets: estado vacío ("no tienes tickets") | ✅ Implementado | `portal.md` §5 |
| CU-30 | Historial de tickets: listado completo con código de seguimiento | ✅ Implementado | `portal.md` §5 |
| CU-31 – CU-38 | ⚠ sin confirmar | — | No encontrados en docs ni commits revisados |
| CU-39 | Consulta pública de deuda por RUT (sin autenticación) | ✅ Implementado | `apps/controller/docs/deuda-publica.md` §1 |
| CU-40 | Consulta pública de deuda por código de abonado | ✅ Implementado | `deuda-publica.md` §2 |
| CU-41 | Detalle de factura (`dias_vencida`/`dias_para_vencer`) + detalle del plan y botón "Pagar ahora" en consulta pública y portal | ✅ Implementado | `deuda-publica.md` §3 · commit `5398d42` |
| CU-42 | Pasarela de pago real | ⏳ **Pendiente** | El botón "Pagar ahora" existe pero es intencionalmente inerte (`apps/view/app/portal/deuda/page.tsx`). Constraint conocida: el "ciclo de facturación activo" no está modelado en el schema — probablemente haya que tocar Prisma para implementarlo |

## Requisitos Funcionales (RF)

| RF | Descripción | CU relacionados |
|---|---|---|
| RF-01 | Login con RUT + contraseña | CU-01 |
| RF-02 | Logout | CU-02 |
| RF-03 | Recuperación de contraseña vía email, sin revelar si el RUT existe | CU-03 |
| RF-04 | ⚠ sin confirmar | — |
| RF-05 | Bloqueo temporal por intentos fallidos por IP (5 en 5 min → 15 min) | — |
| RF-06 | Desbloqueo manual de IP por admin | — |
| RF-07 | Cierre de sesión automático por inactividad (15 min) | CU-12 |
| RF-08 | ⚠ sin confirmar | — |
| RF-09 | Política de complejidad de contraseña (mín. 8, 1 mayúscula, 1 número) | CU-03, CU-10, CU-11 |
| RF-10 | Registro: email obligatorio, confirmación de contraseña, unicidad de RUT/email | CU-04 |

## Huecos de documentación detectados al armar esta tabla

- **`contrataciones` (CU-18) no tiene doc en `apps/controller/docs/`** a pesar de tener su propio módulo (`controller.ts`, `service.ts`, `dto/`) — falta un `contrataciones.md` con el mismo formato que `landing.md`/`portal.md`.
- **CU-05, CU-06, CU-16, CU-19, CU-22, CU-31 a CU-38** no tienen ninguna traza en código, docs o commits — o nunca se implementaron, o quedaron fuera de alcance, o el número no corresponde a este proyecto. Si alguien tiene el documento de requisitos original, vale la pena completar esta tabla y borrar esta nota.
