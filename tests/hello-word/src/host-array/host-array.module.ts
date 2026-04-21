import { Module } from '@nestjs/common';
import { HostArrayController } from './host-array.controller.ts';
import { HostArrayService } from './host-array.service.ts';
import { UsersService } from './users/users.service.ts';

@Module({
  controllers: [HostArrayController],
  providers: [HostArrayService, UsersService],
})
export class HostArrayModule {}
