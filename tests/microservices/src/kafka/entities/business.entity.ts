import type { BusinessDto } from '../dtos/business.dto.ts';
import type { UserEntity } from './user.entity.ts';

export class BusinessEntity {
  constructor(business: BusinessDto) {
    this.id = Math.random() * 99999999;
    this.name = business.name;
    this.phone = business.phone;
    this.createdBy = {
      id: business.user.id,
    };
    this.created = new Date();
  }
  id: number;
  name: string;
  phone: string;
  createdBy: Partial<UserEntity>;
  created: Date;
}
