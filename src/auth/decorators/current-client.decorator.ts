import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: unknown;
}

export const CurrentClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user ?? null;
  },
);
