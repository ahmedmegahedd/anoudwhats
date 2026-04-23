import type { Message } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { BadRequestError } from '../errors';
import { sendWhatsAppText, sendWhatsAppTemplate } from '../meta';

export interface SendMessageInput {
  conversationId: string;
  type: 'text' | 'template';
  content?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: unknown[];
  sentBy: string;
}

export async function sendMessage(dto: SendMessageInput): Promise<Message> {
  const db = getSupabaseAdmin();

  const { data: conversation, error: convErr } = await db
    .from('conversations')
    .select('id, contact_id, contacts(id, phone)')
    .eq('id', dto.conversationId)
    .single();
  if (convErr || !conversation) {
    throw new BadRequestError(`Conversation ${dto.conversationId} not found`);
  }

  const contact = conversation.contacts as unknown as {
    id: string;
    phone: string;
  } | null;
  if (!contact?.phone) throw new BadRequestError('Contact has no phone number');

  let waMessageId: string | null = null;
  try {
    if (dto.type === 'text') {
      if (!dto.content?.trim()) {
        throw new BadRequestError('content is required for text messages');
      }
      waMessageId = await sendWhatsAppText(contact.phone, dto.content);
    } else {
      if (!dto.templateName) {
        throw new BadRequestError(
          'templateName is required for template messages',
        );
      }
      waMessageId = await sendWhatsAppTemplate(
        contact.phone,
        dto.templateName,
        dto.templateLanguage ?? 'en',
        dto.templateComponents ?? [],
      );
    }
  } catch (err: unknown) {
    if (err instanceof BadRequestError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new BadRequestError(`Meta API error: ${msg}`);
  }

  const { data: saved, error: msgErr } = await db
    .from('messages')
    .insert({
      conversation_id: dto.conversationId,
      wa_message_id: waMessageId,
      direction: 'outbound',
      type: dto.type,
      content: dto.content ?? null,
      sent_by: dto.sentBy,
      status: 'sent',
    })
    .select()
    .single();
  if (msgErr) throw new BadRequestError(`Failed to save message: ${msgErr.message}`);

  await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', dto.conversationId);

  return saved as Message;
}
