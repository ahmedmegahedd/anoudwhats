import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInternalTemplateDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: 'en' | 'ar';

  @IsOptional()
  @IsBoolean()
  is_auto?: boolean;

  @IsOptional()
  @IsObject()
  trigger_rule?: Record<string, unknown>;
}
