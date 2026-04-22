import { forwardRef, Module } from '@nestjs/common';

import { CircularService } from './circular.service.ts';
import { InputModule } from './input.module.ts';

@Module({
  imports: [forwardRef(() => InputModule)],
  providers: [CircularService],
  exports: [CircularService],
})
export class CircularModule {}
