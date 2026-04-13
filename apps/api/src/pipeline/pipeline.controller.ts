import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { PipelineService, PipelineFilters } from './pipeline.service';
import { MoveStageDto } from './dto/move-stage.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('board')
  getBoard(@Query() query: Record<string, string>) {
    return this.pipelineService.getBoard(this.parseFilters(query));
  }

  @Get('forecast')
  getForecast(@Query() query: Record<string, string>) {
    return this.pipelineService.getForecast(this.parseFilters(query));
  }

  @Get('stages')
  getStages() {
    return this.pipelineService.getStages();
  }

  @Patch(':id/stage')
  moveStage(@Param('id') id: string, @Body() dto: MoveStageDto) {
    return this.pipelineService.moveStage(id, dto.newStage);
  }

  @Patch(':id/deal')
  updateDeal(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.pipelineService.updateDeal(id, dto);
  }

  private parseFilters(query: Record<string, string>): PipelineFilters {
    const filters: PipelineFilters = {};
    if (query.campaign_id) filters.campaign_id = query.campaign_id;
    if (query.agent_id) filters.assigned_agent_id = query.agent_id;
    if (query.channel) filters.channel = query.channel;
    if (query.source) filters.source = query.source;
    return filters;
  }
}
