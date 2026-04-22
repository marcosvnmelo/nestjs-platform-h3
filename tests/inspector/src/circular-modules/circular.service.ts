import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { InputService } from './input.service.ts';

type InputServiceType = typeof InputService;

@Injectable()
export class CircularService {
  constructor(
    @Inject(forwardRef(() => InputService))
    public readonly service: InputServiceType,
  ) {}
}
