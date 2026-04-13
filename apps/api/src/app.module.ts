import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { AgentsModule } from './agents/agents.module';
import { TeamsModule } from './teams/teams.module';
import { TemplatesModule } from './templates/templates.module';
import { AutomationModule } from './automation/automation.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ReadyDocsModule } from './ready-docs/ready-docs.module';
import { ContactsModule } from './contacts/contacts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    SupabaseModule,
    WhatsAppModule,
    ConversationsModule,
    MessagesModule,
    AgentsModule,
    TeamsModule,
    TemplatesModule,
    AutomationModule,
    AttachmentsModule,
    ReadyDocsModule,
    ContactsModule,
    CampaignsModule,
    PipelineModule,
    SettingsModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
