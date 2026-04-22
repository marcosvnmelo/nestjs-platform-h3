import type { UserEntity } from '../entities/user.entity.ts';

export class BusinessDto {
  name!: string;
  phone!: string;
  user!: UserEntity;
}
