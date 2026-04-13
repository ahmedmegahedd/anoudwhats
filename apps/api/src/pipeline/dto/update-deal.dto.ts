import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  pipeline_stage?: string;

  @IsOptional()
  @IsNumber()
  deal_value?: number;

  @IsOptional()
  @IsUUID()
  assigned_agent_id?: string;
}
