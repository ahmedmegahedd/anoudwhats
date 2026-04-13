import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConversationsService } from './conversations.service';
import type { ConversationStatus } from '@anoud-job/types';

class AssignDto {
  @IsOptional()
  @IsUUID()
  agentId?: string | null;

  @IsOptional()
  @IsUUID()
  teamId?: string | null;
}

class UpdateStatusDto {
  @IsIn(['open', 'resolved', 'archived'])
  @IsString()
  status!: ConversationStatus;
}

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignDto,
  ) {
    return this.conversationsService.assign(id, dto.agentId, dto.teamId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.conversationsService.updateStatus(id, dto.status);
  }
}
