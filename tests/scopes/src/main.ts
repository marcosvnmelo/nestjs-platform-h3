import { NestFactory } from '@nestjs/core';

import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { ApplicationModule } from './app.module.ts';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, new H3Adapter());
  await app.listen(3000);
}
void bootstrap();
