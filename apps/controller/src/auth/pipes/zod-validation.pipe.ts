import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }
}
