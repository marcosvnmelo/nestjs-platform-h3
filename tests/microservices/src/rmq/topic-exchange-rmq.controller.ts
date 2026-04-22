import { lastValueFrom } from 'rxjs';

import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  MessagePattern,
  RmqContext,
  Transport,
} from '@nestjs/microservices';

import type { E2EInfraConfig } from '../e2e-infra.ts';
import { E2E_INFRA } from '../e2e-infra.ts';

@Controller()
export class RMQTopicExchangeController {
  client: ClientProxy;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [e2e?.rmqUrl ?? 'amqp://localhost:5672'],
        queue: 'test2',
        wildcards: true,
      },
    });
  }

  @Get('topic-exchange')
  async topicExchange() {
    return lastValueFrom(this.client.send<string>('wildcard.a.b', 1));
  }

  @MessagePattern('wildcard.*.*')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
    return ctx.getPattern();
  }
}
