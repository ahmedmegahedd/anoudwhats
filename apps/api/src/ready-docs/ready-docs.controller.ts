import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReadyDocsService } from './ready-docs.service';
import { CreateReadyDocDto } from './dto/create-ready-doc.dto';
import { UpdateReadyDocDto } from './dto/update-ready-doc.dto';

@Controller('ready-docs')
export class ReadyDocsController {
  constructor(private readonly readyDocsService: ReadyDocsService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('language') language?: string,
  ) {
    return this.readyDocsService.findAll({ category, language });
  }

  @Get('categories')
  getCategories() {
    return this.readyDocsService.getCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.readyDocsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateReadyDocDto) {
    return this.readyDocsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReadyDocDto) {
    return this.readyDocsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.readyDocsService.delete(id);
  }
}
