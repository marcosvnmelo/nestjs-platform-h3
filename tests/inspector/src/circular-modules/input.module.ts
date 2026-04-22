import { forwardRef, Module } from '@nestjs/common';

import { CircularModule } from './circular.module.ts';
import { InputService } from './input.service.ts';

@Module({
  imports: [forwardRef(() => CircularModule)],
  providers: [InputService],
  exports: [InputService],
})
export class InputModule {}
