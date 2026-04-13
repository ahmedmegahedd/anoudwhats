import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MessagesService } from './messages.service';

class SendMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsIn(['text', 'template'])
  type!: 'text' | 'template';

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @IsOptional()
  @IsArray()
  templateComponents?: unknown[];

  @IsUUID()
  sentBy!: string;
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  send(@Body() dto: SendMessageDto) {
    return this.messagesService.send(dto);
  }
}
