import { IsString } from 'class-validator';

export class MoveStageDto {
  @IsString()
  newStage!: string;

  @IsString()
  oldStage!: string;
}
