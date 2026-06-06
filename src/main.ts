import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);

  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.use(helmet());
  if (isProd) {
    app.use(
      helmet.hsts({ maxAge: 31536000, includeSubDomains: true }),
    );
  }

  app.use(cookieParser());

  app.setGlobalPrefix('api');
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
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  const url = await app.getUrl();
  const displayUrl = url.replace('[::1]', 'localhost');
  console.log(`Backend running at ${displayUrl}`);
}
void bootstrap();
