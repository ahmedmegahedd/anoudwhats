import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [HttpModule, SettingsModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
