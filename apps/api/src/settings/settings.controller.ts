import { Body, Controller, Get, Post } from '@nestjs/common';
import { SettingsService, BusinessHours } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('business-hours')
  getBusinessHours() {
    return this.settingsService.getBusinessHours();
  }

  @Post('business-hours')
  setBusinessHours(@Body() body: BusinessHours) {
    return this.settingsService.setBusinessHours(body);
  }

  @Get('test-connection')
  testConnection() {
    return this.settingsService.testConnection();
  }
}
