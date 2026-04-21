import { Module } from '@nestjs/common';

import { HelloModule } from './hello/hello.module.ts';
import { HostArrayModule } from './host-array/host-array.module.ts';
import { HostModule } from './host/host.module.ts';

@Module({
  imports: [HelloModule, HostModule, HostArrayModule],
})
export class AppModule {}
