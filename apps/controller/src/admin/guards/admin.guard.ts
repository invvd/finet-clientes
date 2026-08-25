import { Injectable } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard.js';

/**
 * Punto único de autorización para todos los endpoints de administración.
 *
 * Hoy delega en ApiKeyGuard (header `x-api-key` contra `ADMIN_API_KEY`) porque el panel
 * administrativo todavía no existe y no hay sesión de admin ni roles en uso — los modelos
 * `rol` / `usuario_rol` están en el schema pero ningún código los consulta.
 *
 * Cuando el panel aporte sesión y roles, se reemplaza la implementación de ESTE archivo
 * y todos los CU del bloque quedan cubiertos sin tocarlos. Por eso los controllers deben
 * usar siempre `AdminGuard` y nunca `ApiKeyGuard` directo.
 *
 * Destino conocido: el Documento 0 (§11.15, enum "Rol usuario CRM") define el rol `ADMIN`,
 * y el modelo normalizado define `UsuarioAdministrador(id_usuario_admin, id_usuario)`. La
 * implementación futura valida sesión + `rol.nombre_rol = 'ADMIN'` vía `usuario_rol`.
 *
 * Se delega en ApiKeyGuard —y no en un stub que devuelva `true`— para que el default falle
 * cerrado: si esta costura se olvida, los endpoints quedan protegidos igual.
 *
 * Mientras tanto, la Excepción 1 de los CU del bloque ("administrador sin permisos
 * suficientes") queda implementada pero sin poder verificarse: se puede probar que el guard
 * deniega, no que deniegue a un admin autenticado sin permisos.
 */
@Injectable()
export class AdminGuard extends ApiKeyGuard {}
