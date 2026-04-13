import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const TRIGGER_TYPES = [
  'message_received',
  'conversation_opened',
  'conversation_resolved',
  'keyword_match',
  'no_reply_timeout',
] as const;

export class CreateRuleDto {
  @IsString()
  name!: string;

  @IsIn(TRIGGER_TYPES as unknown as string[])
  trigger_type!: (typeof TRIGGER_TYPES)[number];

  @IsOptional()
  @IsObject()
  trigger_config?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  conditions?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  actions?: Record<string, unknown>[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
