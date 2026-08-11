import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Without this, Nest never listens for SIGTERM/SIGINT and so never
  // runs onApplicationShutdown hooks — including nestjs-telegraf's,
  // which calls bot.stop() to close the long-poll connection to
  // Telegram's getUpdates endpoint. In watch mode (`nest start
  // --watch`), every file-change restart kills the old process without
  // that hook ever firing, so the old polling connection is orphaned
  // instead of released. The new process then starts polling with the
  // same bot token while Telegram still thinks the old one is active,
  // which is exactly what a "409: terminated by other getUpdates
  // request" means.
  app.enableShutdownHooks();

  app.use(cookieParser(process.env.COOKIE_KEY));
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:5173", process.env.FRONT_URL],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    skipNullProperties: true,
    skipUndefinedProperties: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }));

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
