import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { AutomationModule } from '../automation/automation.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [AutomationModule, AttachmentsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
