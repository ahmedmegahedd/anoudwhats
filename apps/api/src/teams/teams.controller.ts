import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

class AddMemberDto {
  @IsUUID()
  agentId!: string;
}

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.teamsService.delete(id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.teamsService.addMember(id, dto.agentId);
  }

  @Delete(':id/members/:agentId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Param('id') id: string,
    @Param('agentId') agentId: string,
  ) {
    return this.teamsService.removeMember(id, agentId);
  }
}
