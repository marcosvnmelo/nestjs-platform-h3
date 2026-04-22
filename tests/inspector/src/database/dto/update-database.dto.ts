import { PartialType } from '@nestjs/mapped-types';

import { CreateDatabaseDto } from './create-database.dto.ts';

export class UpdateDatabaseDto extends PartialType(CreateDatabaseDto) {}
