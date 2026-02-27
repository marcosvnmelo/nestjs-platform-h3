import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserByIdPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return { id: value };
  }
}
