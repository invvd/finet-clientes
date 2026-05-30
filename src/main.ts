import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  const isProd = config.get<string>('NODE_ENV') === 'production';
  if (isProd) {
    app.set('trust proxy', 1);
  }

  const corsOrigins = (config.get<string>('CORS_ORIGIN') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (isProd && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGIN is required in production');
  }

  app.enableCors(
    isProd
      ? {
          origin: corsOrigins,
        }
      : undefined,
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
