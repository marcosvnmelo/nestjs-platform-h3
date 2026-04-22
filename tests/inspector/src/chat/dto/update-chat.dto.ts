import { PartialType } from '@nestjs/mapped-types';

import { CreateChatDto } from './create-chat.dto.ts';

export class UpdateChatDto extends PartialType(CreateChatDto) {
  id!: number;
}
