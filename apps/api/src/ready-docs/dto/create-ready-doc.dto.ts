import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateReadyDocDto {
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
}
