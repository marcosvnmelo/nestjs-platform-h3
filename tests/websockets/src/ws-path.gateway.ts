import type { Socket } from 'socket.io';

import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  path: '/ws-path',
})
export class WsPathGateway {
  @SubscribeMessage('push')
  onPush(_client: Socket, data: unknown) {
    return {
      event: 'pop',
      data,
    };
  }
}
