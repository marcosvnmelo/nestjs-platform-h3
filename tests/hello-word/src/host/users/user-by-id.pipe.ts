import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { UsersService } from './users.service.ts';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  constructor(private readonly usersService: UsersService) {}

  transform(value: string, metadata: ArgumentMetadata) {
    return this.usersService.findById(value);
  }
}
