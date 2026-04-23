import { getSupabaseAdmin } from '../supabase';
import { processMediaFromWebhook } from './attachments';
import { evaluateAndRun, isOutsideBusinessHours } from './automation';

async function upsertContact(phone: string, name?: string): Promise<string> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from('contacts')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();
  if (existing) {
    await db.from('contacts').update({ last_seen_at: now }).eq('id', existing.id);
    return existing.id as string;
  }
  const { data: created, error } = await db
    .from('contacts')
    .insert({ phone, name: name ?? null, channel: 'WhatsApp', last_seen_at: now })
    .select('id')
    .single();
  if (error) throw new Error(`upsertContact failed: ${error.message}`);
  return created.id as string;
}

async function upsertConversation(contactId: string): Promise<string> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .or('status.eq.open,status.eq.assigned')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    await db
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', existing.id);
    return existing.id as string;
  }
  const { data: created, error } = await db
    .from('conversations')
    .insert({
      contact_id: contactId,
      status: 'open',
      channel: 'WhatsApp',
      last_message_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(`upsertConversation failed: ${error.message}`);
  return created.id as string;
}

async function saveMessage(
  conversationId: string,
  waMessageId: string,
  type: string,
  content?: string,
): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      wa_message_id: waMessageId,
      direction: 'inbound',
      type,
      content: content ?? null,
      media_url: null,
      status: 'delivered',
    })
    .select('id')
    .single();
  if (error) {
    console.error(`saveMessage failed: ${error.message}`);
    return null;
  }
  return (data?.id as string) ?? null;
}

async function handleStatusUpdate(
  status: Record<string, unknown>,
): Promise<void> {
  const db = getSupabaseAdmin();
  const waMessageId = status.id as string;
  const newStatus = status.status as string;
  if (!['sent', 'delivered', 'read', 'failed'].includes(newStatus)) return;
  const { error } = await db
    .from('messages')
    .update({ status: newStatus })
    .eq('wa_message_id', waMessageId);
  if (error) {
    console.error(`handleStatusUpdate failed for ${waMessageId}: ${error.message}`);
  } else {
    console.log(`[STATUS] ${waMessageId} → ${newStatus}`);
  }
}

export async function processIncoming(
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const entry = (payload.entry as Record<string, unknown>[])?.[0];
    const changes = (entry?.changes as Record<string, unknown>[])?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;

    if (!value) {
      console.warn('Webhook received with no value payload');
      return;
    }

    const statuses = value.statuses as Record<string, unknown>[] | undefined;
    if (statuses?.length) {
      await handleStatusUpdate(statuses[0]);
      return;
    }

    const messages = value.messages as Record<string, unknown>[] | undefined;
    if (!messages?.length) return;

    const raw = messages[0];
    const waContacts = value.contacts as Record<string, unknown>[] | undefined;
    const profileName = (
      (waContacts?.[0] as Record<string, unknown>)?.profile as Record<
        string,
        unknown
      >
    )?.name as string | undefined;

    const from = raw.from as string;
    const waMessageId = raw.id as string;
    const type = raw.type as string;

    let body: string | undefined;
    let mediaId: string | undefined;
    let mimeType: string | undefined;
    let documentFileName: string | undefined;

    if (type === 'text') {
      body = ((raw.text as Record<string, unknown>)?.body as string) ?? undefined;
    } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
      const media = raw[type] as Record<string, unknown>;
      mediaId = media?.id as string | undefined;
      mimeType = media?.mime_type as string | undefined;
      if (type === 'document') {
        documentFileName = media?.filename as string | undefined;
        body = documentFileName;
      }
    }

    console.log(
      `[INBOUND] from=${from} type=${type} waId=${waMessageId}` +
        (body ? ` body="${body.slice(0, 60)}"` : '') +
        (mediaId ? ` mediaId=${mediaId}` : ''),
    );

    const contactId = await upsertContact(from, profileName);
    const conversationId = await upsertConversation(contactId);
    const savedMessageId = await saveMessage(
      conversationId,
      waMessageId,
      type,
      body,
    );

    if (
      savedMessageId &&
      mediaId &&
      mimeType &&
      type !== 'text' &&
      type !== 'sticker'
    ) {
      void processMediaFromWebhook(
        mediaId,
        savedMessageId,
        contactId,
        mimeType,
        documentFileName,
      ).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Media processing failed: ${msg}`);
      });
    }

    try {
      const db = getSupabaseAdmin();
      const { count } = await db
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      const isFirstMessage = (count ?? 0) === 1;
      const isOutsideHours = await isOutsideBusinessHours();

      void evaluateAndRun({
        conversationId,
        contactId,
        messageContent: body ?? '',
        messageType: type,
        isFirstMessage,
        isOutsideHours,
        channel: 'WhatsApp',
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Automation error: ${msg}`);
      });
    } catch (autoErr) {
      console.error('Automation setup failed', autoErr);
    }
  } catch (err) {
    console.error('Failed to process incoming WhatsApp payload', err);
  }
}
