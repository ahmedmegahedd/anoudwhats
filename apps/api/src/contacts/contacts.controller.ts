import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import type { Response } from 'express';
import { ContactsService, ContactFilters } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';

class AddTagDto {
  @IsString()
  tag!: string;
}

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.contactsService.findAll(this.parseFilters(query));
  }

  @Get('stats')
  getStats() {
    return this.contactsService.getStats();
  }

  @Get('channels')
  getChannels() {
    return this.contactsService.getChannels();
  }

  @Get('sources')
  getSources() {
    return this.contactsService.getSources();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const csv = await this.contactsService.exportCsv(this.parseFilters(query));
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contacts-${date}.csv"`,
    );
    res.send(csv);
  }

  @Post('bulk-delete')
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.contactsService.bulkDelete(dto.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.contactsService.delete(id);
  }

  @Post(':id/tags')
  addTag(@Param('id') id: string, @Body() dto: AddTagDto) {
    return this.contactsService.addTag(id, dto.tag);
  }

  @Delete(':id/tags/:tag')
  removeTag(@Param('id') id: string, @Param('tag') tag: string) {
    return this.contactsService.removeTag(id, decodeURIComponent(tag));
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private parseFilters(query: Record<string, string>): ContactFilters {
    const filters: ContactFilters = {};
    if (query.search) filters.search = query.search;
    if (query.channel) filters.channel = this.splitMulti(query.channel);
    if (query.source) filters.source = this.splitMulti(query.source);
    if (query.campaign_id) filters.campaign_id = query.campaign_id;
    if (query.pipeline_stage) {
      filters.pipeline_stage = this.splitMulti(query.pipeline_stage);
    }
    if (query.assigned_agent_id) {
      filters.assigned_agent_id = query.assigned_agent_id;
    }
    if (query.tag) filters.tag = query.tag;
    if (query.date_from) filters.date_from = query.date_from;
    if (query.date_to) filters.date_to = query.date_to;
    if (query.page) filters.page = Number(query.page);
    if (query.limit) filters.limit = Number(query.limit);
    return filters;
  }

  private splitMulti(value: string): string | string[] {
    if (value.includes(',')) return value.split(',').filter(Boolean);
    return value;
  }
}
