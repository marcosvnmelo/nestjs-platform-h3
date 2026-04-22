import type { Socket } from 'socket.io';

import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway(8080, {
  namespace: 'test',
})
export class NamespaceGateway {
  @SubscribeMessage('push')
  onPush(_client: Socket, data: unknown) {
    return {
      event: 'pop',
      data,
    };
  }
}
