import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from './app.module.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new H3Adapter());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
void bootstrap();
