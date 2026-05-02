import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from './app.module.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new H3Adapter());
  app.enableVersioning({
    type: VersioningType.MEDIA_TYPE,
    key: 'v=',
  });

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
