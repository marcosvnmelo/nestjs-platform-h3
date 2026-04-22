import { DynamicModule, Inject, Module, Provider } from '@nestjs/common';

import { HelloController } from './hello.controller.ts';
import { HelloService } from './hello.service.ts';
import { TestController } from './test.controller.ts';
import { UsersService } from './users/users.service.ts';

@Module({
  controllers: [HelloController, TestController],
  providers: [HelloService, UsersService],
})
export class HelloModule {
  // @ts-expect-error - unused on original code
  constructor(@Inject('META') private readonly meta) {}

  static forRoot(meta: Provider): DynamicModule {
    return {
      module: HelloModule,
      providers: [meta],
    };
  }
}
