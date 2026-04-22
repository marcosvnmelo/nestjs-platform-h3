import { Injectable, Module } from '@nestjs/common';

import { GlobalService } from './global.module.ts';

@Injectable()
export class LazyService {
  constructor(public globalService: GlobalService) {}
}

@Module({
  providers: [LazyService],
})
export class LazyModule {}
