import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { AutomationService } from './automation.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

class ToggleRuleDto {
  @IsBoolean()
  isActive!: boolean;
}

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  // ── Rules ─────────────────────────────────────────────────────────────

  @Get('rules')
  findAllRules() {
    return this.automationService.findAllRules();
  }

  @Get('rules/:id')
  findOneRule(@Param('id') id: string) {
    return this.automationService.findOneRule(id);
  }

  @Post('rules')
  createRule(@Body() dto: CreateRuleDto) {
    return this.automationService.createRule(dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.automationService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.automationService.deleteRule(id);
  }

  @Patch('rules/:id/toggle')
  toggleRule(@Param('id') id: string, @Body() dto: ToggleRuleDto) {
    return this.automationService.toggleRule(id, dto.isActive);
  }

  // ── Logs ──────────────────────────────────────────────────────────────

  @Get('logs')
  findLogs(
    @Query('rule_id') ruleId?: string,
    @Query('result') result?: 'success' | 'failed',
  ) {
    return this.automationService.findLogs({ rule_id: ruleId, result });
  }
}
