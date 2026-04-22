import { Observable } from 'rxjs';
import { scan, take } from 'rxjs/operators';

import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';

import type { E2EInfraConfig } from '../e2e-infra.ts';
import { E2E_INFRA } from '../e2e-infra.ts';

@Controller()
export class NatsBroadcastController {
  client: ClientProxy;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    this.client = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: e2e?.natsServers ?? 'nats://localhost:4222',
      },
    });
  }

  @Get('broadcast')
  multicats() {
    return this.client.send<number>('broadcast.test', {}).pipe(
      scan((a, b) => a + b),
      take(2),
    );
  }

  @MessagePattern('broadcast.*')
  replyBroadcast(): Observable<number> {
    return new Observable((observer) => observer.next(1));
  }
}
