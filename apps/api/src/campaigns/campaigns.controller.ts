import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignsService, CampaignFilters } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SendBulkMessageDto } from './dto/send-bulk-message.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    const filters: CampaignFilters = {};
    if (query.search) filters.search = query.search;
    if (query.channel) filters.channel = query.channel;
    if (query.source) filters.source = query.source;
    if (query.date_from) filters.date_from = query.date_from;
    if (query.date_to) filters.date_to = query.date_to;
    return this.campaignsService.findAll(filters);
  }

  @Get('jobs/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.campaignsService.getBulkJobStatus(jobId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.campaignsService.delete(id);
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file'))
  importLeads(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.campaignsService.importLeads(id, file);
  }

  @Post(':id/bulk-message')
  sendBulkMessage(
    @Param('id') id: string,
    @Body() dto: SendBulkMessageDto,
  ) {
    return this.campaignsService.sendBulkMessage(id, dto);
  }
}
