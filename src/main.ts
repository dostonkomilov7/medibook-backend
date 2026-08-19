import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser'

// nestjs-telegraf calls `bot.launch(...)` without awaiting it or attaching
// a .catch() (see createBotFactory in its source) — launch() internally
// awaits the polling loop for as long as the bot runs, so that unawaited
// promise only settles when polling stops for good. Telegraf's own
// polling loop deliberately re-throws on a 409 ("Conflict: terminated by
// other getUpdates request" — another process is already polling this
// same bot token, e.g. a local dev instance and this deployment running
// at once) instead of retrying, since it's not a transient error. With
// nothing awaiting or catching that rejection, Node's default behavior
// (since v15) is to treat it as fatal and crash the *entire* process —
// so a Telegram-side conflict was taking the whole API down, not just the
// bot. This is a gap in the library, not something fixable from our own
// call site, so the safety net has to be a process-level handler instead.
// A registration/appointment notification failing to send to Telegram
// should never be able to take the whole backend offline.
process.on('unhandledRejection', (reason) => {
  Logger.error(`Unhandled promise rejection (kept the process alive): ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`, undefined, 'UnhandledRejection');
});

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
