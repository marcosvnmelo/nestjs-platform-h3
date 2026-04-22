import type { Socket } from 'socket.io';

import { OnApplicationShutdown, UseInterceptors } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

import { RequestInterceptor } from './request.interceptor.ts';

@WebSocketGateway()
export class ServerGateway implements OnApplicationShutdown {
  @SubscribeMessage('push')
  onPush(_client: Socket, data: unknown) {
    return {
      event: 'pop',
      data,
    };
  }

  @UseInterceptors(RequestInterceptor)
  @SubscribeMessage('getClient')
  getPathCalled(
    client: Socket & { pattern: string },
    data: Record<string, unknown>,
  ) {
    return {
      event: 'popClient',
      data: { ...data, path: client.pattern },
    };
  }

  onApplicationShutdown() {
    // shutdown hook (tests)
  }
}
