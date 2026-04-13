import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
