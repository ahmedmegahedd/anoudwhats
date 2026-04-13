import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import type { Message } from '@anoud-job/types';

export interface SendMessageDto {
  conversationId: string;
  type: 'text' | 'template';
  content?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: unknown[];
  sentBy: string;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async send(dto: SendMessageDto): Promise<Message> {
    const db = this.supabaseService.getClient();

    // 1. Resolve conversation → contact → phone
    const { data: conversation, error: convErr } = await db
      .from('conversations')
      .select('id, contact_id, contacts(id, phone)')
      .eq('id', dto.conversationId)
      .single();

    if (convErr || !conversation) {
      throw new BadRequestException(`Conversation ${dto.conversationId} not found`);
    }

    const contact = conversation.contacts as unknown as { id: string; phone: string } | null;
    if (!contact?.phone) {
      throw new BadRequestException('Contact has no phone number');
    }

    // 2. Build Meta Cloud API body
    let messageBody: Record<string, unknown>;

    if (dto.type === 'text') {
      if (!dto.content?.trim()) {
        throw new BadRequestException('content is required for text messages');
      }
      messageBody = {
        messaging_product: 'whatsapp',
        to: contact.phone,
        type: 'text',
        text: { body: dto.content },
      };
    } else {
      // template
      if (!dto.templateName) {
        throw new BadRequestException('templateName is required for template messages');
      }
      messageBody = {
        messaging_product: 'whatsapp',
        to: contact.phone,
        type: 'template',
        template: {
          name: dto.templateName,
          language: { code: dto.templateLanguage ?? 'en' },
          components: dto.templateComponents ?? [],
        },
      };
    }

    // 3. Call Meta Cloud API
    const phoneNumberId = this.config.getOrThrow<string>('META_PHONE_NUMBER_ID');
    const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    let waMessageId: string | undefined;
    try {
      const { data: metaResponse } = await firstValueFrom(
        this.httpService.post(url, messageBody, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      waMessageId = (metaResponse as Record<string, unknown[]>).messages?.[0] as
        | string
        | undefined;

      // Meta returns { messages: [{ id: "wamid.xxx" }] }
      const msgArr = (metaResponse as { messages?: { id: string }[] }).messages;
      waMessageId = msgArr?.[0]?.id;

      this.logger.log(`[OUTBOUND] to=${contact.phone} waId=${waMessageId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Meta API call failed: ${msg}`);
      throw new BadRequestException(`Meta API error: ${msg}`);
    }

    // 4. Persist outbound message
    const { data: saved, error: msgErr } = await db
      .from('messages')
      .insert({
        conversation_id: dto.conversationId,
        wa_message_id: waMessageId ?? null,
        direction: 'outbound',
        type: dto.type,
        content: dto.content ?? null,
        sent_by: dto.sentBy,
        status: 'sent',
      })
      .select()
      .single();

    if (msgErr) throw new BadRequestException(`Failed to save message: ${msgErr.message}`);

    // 5. Update conversation last_message_at
    await db
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', dto.conversationId);

    return saved as Message;
  }
}
