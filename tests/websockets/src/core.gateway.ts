import type { Socket } from 'socket.io';

import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway(8090)
export class CoreGateway {
  @SubscribeMessage('push')
  onPush(@ConnectedSocket() _client: Socket, @MessageBody() data: unknown) {
    return {
      event: 'pop',
      data,
    };
  }
}
