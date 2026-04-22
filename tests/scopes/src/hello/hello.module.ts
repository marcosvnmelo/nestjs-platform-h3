import { DynamicModule, Inject, Module, Provider, Scope } from '@nestjs/common';

import { HelloController } from './hello.controller.ts';
import { HelloService } from './hello.service.ts';
import { UsersService } from './users/users.service.ts';

@Module({
  controllers: [HelloController],
  providers: [
    HelloService,
    UsersService,
    {
      provide: 'REQUEST_ID',
      useFactory: () => 1,
      scope: Scope.REQUEST,
    },
  ],
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
