import { Module } from '@nestjs/common';

import { FastifyController } from './fastify.controller.ts';

@Module({
  controllers: [FastifyController],
})
export class FastifyModule {}
