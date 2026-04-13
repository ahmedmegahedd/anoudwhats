import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateReadyDocDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: 'en' | 'ar';
}
