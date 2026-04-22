import { Module } from '@nestjs/common';

import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './chat.service.ts';

@Module({
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
