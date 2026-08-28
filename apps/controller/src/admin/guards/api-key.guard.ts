import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Compara dos secretos en tiempo constante.
 *
 * `===` sobre strings corta en el primer carácter distinto, así que el tiempo de respuesta
 * filtra cuántos caracteres del prefijo acertó quien prueba: con suficientes intentos se
 * puede reconstruir la clave carácter por carácter.
 *
 * Se comparan los SHA-256 y no los valores crudos porque `timingSafeEqual` exige buffers
 * del mismo largo: hashear primero deja ambos en 32 bytes siempre, y de paso evita que el
 * largo de la clave recibida se filtre por un corto-circuito.
 */
function coincideEnTiempoConstante(
  recibida: string,
  esperada: string,
): boolean {
  const huella = (valor: string) =>
    createHash('sha256').update(valor, 'utf8').digest();
  return timingSafeEqual(huella(recibida), huella(esperada));
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException('ADMIN_API_KEY not configured');
    }

    if (!coincideEnTiempoConstante(apiKey, expectedKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
