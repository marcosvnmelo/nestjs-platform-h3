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
export class RMQBroadcastController {
  client: ClientProxy;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [e2e?.rmqUrl ?? 'amqp://localhost:5672'],
        queue: 'test_broadcast',
        queueOptions: { durable: false },
        socketOptions: { noDelay: true },
      },
    });
  }

  @Get('broadcast')
  multicats() {
    return this.client.send<number>({ cmd: 'broadcast' }, {}).pipe(
      scan((a, b) => a + b),
      take(2),
    );
  }

  @MessagePattern({ cmd: 'broadcast' })
  replyBroadcast(): Observable<number> {
    return new Observable((observer) => observer.next(1));
  }
}
