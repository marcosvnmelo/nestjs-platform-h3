import { Module } from '@nestjs/common';

import { BenchmarkController } from './app.controller.ts';

@Module({
  controllers: [BenchmarkController],
})
export class BenchmarkModule {}
