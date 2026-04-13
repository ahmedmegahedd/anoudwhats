import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  // Declare /:id/stats before /:id so the static suffix isn't swallowed
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.agentsService.getStats(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, dto);
  }

  @Patch(':id/availability')
  @HttpCode(HttpStatus.OK)
  updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.agentsService.updateAvailability(id, dto.availability);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.agentsService.delete(id);
  }
}
