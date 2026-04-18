import { Module } from '@nestjs/common';

import { ErrorsController } from './errors.controller.ts';

@Module({
  controllers: [ErrorsController],
})
export class ErrorsModule {}
