import { Module } from '@nestjs/common';
import { HostController } from './host.controller.ts';
import { HostService } from './host.service.ts';
import { UsersService } from './users/users.service.ts';

@Module({
  controllers: [HostController],
  providers: [HostService, UsersService],
})
export class HostModule {}
