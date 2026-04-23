import type { Attachment, Message, MessageType } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { BadRequestError } from '../errors';
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  sendWhatsAppMedia,
  uploadMediaToMeta,
} from '../meta';

const MEDIA_BUCKET = 'attachments';

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

export interface SendMediaInput {
  conversationId: string;
  file: { buffer: Buffer; name: string; mimeType: string; size: number };
  caption?: string;
  sentBy: string;
}

function mediaKindFromMime(
  mime: string,
): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

export async function sendMediaMessage(
  dto: SendMediaInput,
): Promise<{ message: Message; attachment: Attachment | null }> {
  if (!dto.file.buffer.length) throw new BadRequestError('file is empty');
  if (dto.file.size > MAX_MEDIA_BYTES) {
    throw new BadRequestError('file exceeds 16MB limit');
  }

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

  const kind = mediaKindFromMime(dto.file.mimeType);
  const messageType: MessageType = kind;

  let waMediaId: string;
  try {
    waMediaId = await uploadMediaToMeta(
      dto.file.buffer,
      dto.file.mimeType,
      dto.file.name,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BadRequestError(`Meta media upload failed: ${msg}`);
  }

  let waMessageId: string | null = null;
  try {
    waMessageId = await sendWhatsAppMedia(contact.phone, waMediaId, kind, {
      caption: dto.caption,
      fileName: kind === 'document' ? dto.file.name : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BadRequestError(`Meta send media failed: ${msg}`);
  }

  const { data: saved, error: msgErr } = await db
    .from('messages')
    .insert({
      conversation_id: dto.conversationId,
      wa_message_id: waMessageId,
      direction: 'outbound',
      type: messageType,
      content: dto.caption ?? null,
      media_mime: dto.file.mimeType,
      sent_by: dto.sentBy,
      status: 'sent',
    })
    .select()
    .single();
  if (msgErr || !saved) {
    throw new BadRequestError(`Failed to save message: ${msgErr?.message}`);
  }
  const message = saved as Message;

  const safeName = dto.file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `${contact.id}/${message.id}/${safeName}`;
  const { error: uploadErr } = await db.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, dto.file.buffer, {
      contentType: dto.file.mimeType,
      upsert: true,
    });

  let attachment: Attachment | null = null;
  if (uploadErr) {
    console.warn(`Supabase storage upload failed: ${uploadErr.message}`);
  } else {
    const { data: publicData } = db.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;

    const { data: attRow, error: attErr } = await db
      .from('attachments')
      .insert({
        message_id: message.id,
        contact_id: contact.id,
        file_name: dto.file.name,
        file_type: kind,
        mime_type: dto.file.mimeType,
        storage_path: storagePath,
        file_size: dto.file.size,
        media_url: publicUrl,
      })
      .select()
      .single();
    if (attErr) {
      console.warn(`Attachment insert failed: ${attErr.message}`);
    } else {
      attachment = attRow as Attachment;
    }

    await db
      .from('messages')
      .update({ media_url: publicUrl })
      .eq('id', message.id);
    message.media_url = publicUrl;
  }

  await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', dto.conversationId);

  return { message, attachment };
}
