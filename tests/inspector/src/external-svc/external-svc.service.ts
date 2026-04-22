import { Injectable } from '@nestjs/common';

import { CreateExternalSvcDto } from './dto/create-external-svc.dto.ts';
import { UpdateExternalSvcDto } from './dto/update-external-svc.dto.ts';

@Injectable()
export class ExternalSvcService {
  create(_createExternalSvcDto: CreateExternalSvcDto) {
    return 'This action adds a new externalSvc';
  }

  findAll() {
    return `This action returns all externalSvc`;
  }

  findOne(id: number) {
    return `This action returns a #${id} externalSvc`;
  }

  update(id: number, _updateExternalSvcDto: UpdateExternalSvcDto) {
    return `This action updates a #${id} externalSvc`;
  }

  remove(id: number) {
    return `This action removes a #${id} externalSvc`;
  }
}
