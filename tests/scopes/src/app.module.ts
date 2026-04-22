import { Module } from '@nestjs/common';

import { HelloModule } from './hello/hello.module.ts';

@Module({
  imports: [HelloModule.forRoot({ provide: 'META', useValue: true })],
})
export class ApplicationModule {}
