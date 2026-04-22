import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { UsersService } from './users.service.ts';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor(private readonly usersService: UsersService) {
    UserByIdPipe.COUNTER++;
  }

  transform(value: string, _metadata: ArgumentMetadata) {
    return this.usersService.findById(value);
  }
}
