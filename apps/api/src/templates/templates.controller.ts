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
import { TemplatesService } from './templates.service';
import { CreateInternalTemplateDto } from './dto/create-internal-template.dto';
import { UpdateInternalTemplateDto } from './dto/update-internal-template.dto';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ── WA Templates ──────────────────────────────────────────────────────

  @Post('wa/sync')
  syncFromMeta() {
    return this.templatesService.syncFromMeta();
  }

  @Get('wa')
  findAllWa(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('language') language?: string,
  ) {
    return this.templatesService.findAllWa({ status, category, language });
  }

  @Get('wa/:id')
  findOneWa(@Param('id') id: string) {
    return this.templatesService.findOneWa(id);
  }

  @Delete('wa/:id')
  deleteWa(@Param('id') id: string) {
    return this.templatesService.deleteWa(id);
  }

  // ── Internal Templates ────────────────────────────────────────────────

  @Get('internal')
  findAllInternal(
    @Query('category') category?: string,
    @Query('language') language?: string,
    @Query('is_auto') isAuto?: string,
  ) {
    const filters: { category?: string; language?: string; is_auto?: boolean } = {};
    if (category) filters.category = category;
    if (language) filters.language = language;
    if (isAuto === 'true') filters.is_auto = true;
    if (isAuto === 'false') filters.is_auto = false;
    return this.templatesService.findAllInternal(filters);
  }

  @Get('internal/:id')
  findOneInternal(@Param('id') id: string) {
    return this.templatesService.findOneInternal(id);
  }

  @Post('internal')
  createInternal(@Body() dto: CreateInternalTemplateDto) {
    return this.templatesService.createInternal(dto);
  }

  @Patch('internal/:id')
  updateInternal(
    @Param('id') id: string,
    @Body() dto: UpdateInternalTemplateDto,
  ) {
    return this.templatesService.updateInternal(id, dto);
  }

  @Delete('internal/:id')
  deleteInternal(@Param('id') id: string) {
    return this.templatesService.deleteInternal(id);
  }
}
