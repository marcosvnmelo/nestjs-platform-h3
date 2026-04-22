import { Inject, Injectable } from '@nestjs/common';

import { DependencyService } from './dependency.service.ts';

export const SYMBOL_TOKEN = Symbol('token');

@Injectable()
export class PropertiesService {
  @Inject() service!: DependencyService;
  @Inject('token') token!: boolean;
  @Inject(SYMBOL_TOKEN) symbolToken!: boolean;
}
