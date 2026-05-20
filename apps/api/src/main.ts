import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.setGlobalPrefix('api/v1');
  // Validation handled by ZodValidationPipe per-route (see modules/*/presentation)
  app.useGlobalFilters(new AllExceptionsFilter());
  // CORS — exact origins (comma-separated WEB_ORIGIN) + *.vercel.app + localhost
  const exactOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const vercelRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
  const localhostRegex = /^https?:\/\/localhost(:\d+)?$/;
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (exactOrigins.includes(origin)) return callback(null, true);
      if (vercelRegex.test(origin) || localhostRegex.test(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  });

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 API ready on port ${port} | CORS: ${exactOrigins.join(', ')} + *.vercel.app`, 'Bootstrap');
}

bootstrap();
