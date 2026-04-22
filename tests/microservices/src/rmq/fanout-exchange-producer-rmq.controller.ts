import { lastValueFrom } from 'rxjs';

import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

import type { E2EInfraConfig } from '../e2e-infra.ts';
import { E2E_INFRA } from '../e2e-infra.ts';

@Controller()
export class RMQFanoutExchangeProducerController {
  client: ClientProxy;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [e2e?.rmqUrl ?? 'amqp://localhost:5672'],
        exchange: 'test.fanout',
        exchangeType: 'fanout',
      },
    });
  }

  @Get('fanout-exchange')
  async topicExchange() {
    return lastValueFrom(this.client.send<string>('ping', 1));
  }
}
