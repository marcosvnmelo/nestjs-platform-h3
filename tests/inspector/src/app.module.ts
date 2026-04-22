import { Module, Scope } from '@nestjs/common';

import { AppV1Controller } from './app-v1.controller.ts';
import { AppV2Controller } from './app-v2.controller.ts';
import { CatsModule } from './cats/cats.module.ts';
import { ChatModule } from './chat/chat.module.ts';
import { HelloModule as CircularHelloModule } from './circular-hello/hello.module.ts';
import { HelloService } from './circular-hello/hello.service.ts';
import { InputModule } from './circular-modules/input.module.ts';
import { CoreModule } from './core/core.module.ts';
import { DatabaseModule } from './database/database.module.ts';
import { DogsModule } from './dogs/dogs.module.ts';
import { DurableModule } from './durable/durable.module.ts';
import { ExternalSvcModule } from './external-svc/external-svc.module.ts';
import { PropertiesModule } from './properties/properties.module.ts';
import { RequestChainModule } from './request-chain/request-chain.module.ts';
import { UsersModule } from './users/users.module.ts';

class Meta {
  static COUNTER = 0;
  // @ts-expect-error - unused on original code
  constructor(private readonly helloService: HelloService) {
    Meta.COUNTER++;
  }
}

@Module({
  imports: [
    CoreModule,
    CatsModule,
    CircularHelloModule.forRoot({
      provide: 'META',
      useClass: Meta,
      scope: Scope.REQUEST,
    }),
    DurableModule,
    DogsModule,
    UsersModule,
    DatabaseModule,
    ExternalSvcModule,
    ChatModule,
    RequestChainModule,
    PropertiesModule,
    InputModule,
  ],
  controllers: [AppV1Controller, AppV2Controller],
})
export class AppModule {}
