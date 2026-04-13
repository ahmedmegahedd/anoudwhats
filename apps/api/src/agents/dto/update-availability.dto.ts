import { IsIn, IsString } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsIn(['online', 'away', 'offline'])
  @IsString()
  availability!: 'online' | 'away' | 'offline';
}
