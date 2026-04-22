import { Body, Controller, Get, Post } from '@nestjs/common';

import { CatsService } from './cats.service.ts';
import { CreateCatDto } from './dto/create-cat.dto.ts';
import { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
