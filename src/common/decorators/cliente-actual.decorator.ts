import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator que extrae el objeto cliente inyectado por JwtAuthGuard.
 * Uso: @ClienteActual() cliente: cliente
 */
export const ClienteActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.cliente;
  },
);
