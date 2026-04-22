import { DynamicModule, Inject, Module, Provider } from '@nestjs/common';

import { HelloController } from './hello.controller.ts';
import { HelloService } from './hello.service.ts';
import { UsersService } from './users/users.service.ts';

@Module({
  controllers: [HelloController],
  providers: [HelloService, UsersService],
})
export class HelloModule {
  // @ts-expect-error - unused on original code
  constructor(@Inject('META') private readonly meta: unknown) {}

  static forRoot(meta: Provider): DynamicModule {
    return {
      module: HelloModule,
      providers: [meta],
    };
  }
}
