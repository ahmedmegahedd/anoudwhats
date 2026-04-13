import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { BulkDownloadDto } from './dto/bulk-download.dto';
import type { AttachmentFileType } from '@anoud-job/types';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  findAll(
    @Query('file_type') fileType?: AttachmentFileType,
    @Query('contact_id') contactId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.attachmentsService.findAll({
      file_type: fileType,
      contact_id: contactId,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('file_type') fileType?: AttachmentFileType,
  ) {
    return this.attachmentsService.search(q, { file_type: fileType });
  }

  @Post('bulk-download')
  bulkDownload(@Body() dto: BulkDownloadDto) {
    return this.attachmentsService.bulkDownloadUrls(dto.ids);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.attachmentsService.getDownloadUrl(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attachmentsService.findOne(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.attachmentsService.delete(id);
  }
}
