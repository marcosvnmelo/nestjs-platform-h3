import { Module } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

import { EagerModule } from './eager.module.ts';
import { GlobalModule } from './global.module.ts';
import { LazyModule } from './lazy.module.ts';

@Module({
  imports: [GlobalModule, EagerModule],
})
export class AppModule {
  constructor(public loader: LazyModuleLoader) {}

  async onApplicationBootstrap() {
    await this.loader.load(() => LazyModule);
  }
}
