import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class SendBulkMessageDto {
  @IsIn(['text', 'template'])
  type!: 'text' | 'template';

  @ValidateIf((o: SendBulkMessageDto) => o.type === 'text')
  @IsString()
  message?: string;

  @ValidateIf((o: SendBulkMessageDto) => o.type === 'template')
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @IsOptional()
  @IsArray()
  templateComponents?: unknown[];
}
