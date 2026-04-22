import { NestFactory } from '@nestjs/core';

import { ApplicationModule } from './app.module.ts';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  await app.listen(3000);
}
void bootstrap();
