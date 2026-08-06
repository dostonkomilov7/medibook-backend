import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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
