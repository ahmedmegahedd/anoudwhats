import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  IsUUID,
} from 'class-validator';

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsIn(['admin', 'agent'])
  role?: 'admin' | 'agent';

  // Allow null to remove from a team; skip UUID check when null
  @IsOptional()
  @ValidateIf((o: UpdateAgentDto) => o.team_id !== null)
  @IsUUID()
  team_id?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  max_chats?: number;

  @IsOptional()
  @IsIn(['online', 'away', 'offline'])
  availability?: 'online' | 'away' | 'offline';
}
