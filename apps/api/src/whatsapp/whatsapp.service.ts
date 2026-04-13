import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AutomationService } from '../automation/automation.service';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly automationService: AutomationService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async processIncoming(payload: Record<string, unknown>): Promise<void> {
    try {
      const entry = (payload.entry as Record<string, unknown>[])?.[0];
      const changes = (entry?.changes as Record<string, unknown>[])?.[0];
      const value = changes?.value as Record<string, unknown> | undefined;

      if (!value) {
        this.logger.warn('Webhook received with no value payload');
        return;
      }

      // ── Handle delivery status updates ────────────────────────────────────
      const statuses = value.statuses as Record<string, unknown>[] | undefined;
      if (statuses?.length) {
        await this.handleStatusUpdate(statuses[0]);
        return;
      }

      // ── Handle inbound messages ───────────────────────────────────────────
      const messages = value.messages as Record<string, unknown>[] | undefined;
      if (!messages?.length) return;

      const raw = messages[0];
      const waContacts = value.contacts as Record<string, unknown>[] | undefined;
      const profileName = (
        (waContacts?.[0] as Record<string, unknown>)?.profile as Record<string, unknown>
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

      this.logger.log(
        `[INBOUND] from=${from} type=${type} waId=${waMessageId}` +
          (body ? ` body="${body.slice(0, 60)}"` : '') +
          (mediaId ? ` mediaId=${mediaId}` : ''),
      );

      // ── Pipeline ──────────────────────────────────────────────────────────
      const contactId = await this.upsertContact(from, profileName);
      const conversationId = await this.upsertConversation(contactId);
      const savedMessageId = await this.saveMessage(
        conversationId,
        waMessageId,
        type,
        body,
      );

      // ── Step 6a: Download & process media (fire-and-forget) ───────────────
      if (
        savedMessageId &&
        mediaId &&
        mimeType &&
        type !== 'text' &&
        type !== 'sticker'
      ) {
        void this.attachmentsService
          .processMediaFromWebhook(
            mediaId,
            savedMessageId,
            contactId,
            mimeType,
            documentFileName,
          )
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Media processing failed: ${msg}`);
          });
      }

      // ── Step 6: Automation (fire-and-forget, never crashes webhook) ───────
      try {
        const db = this.supabaseService.getClient();
        const { count } = await db
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversationId);
        const isFirstMessage = (count ?? 0) === 1;
        const isOutsideHours = await this.automationService.isOutsideBusinessHours();

        // Fire-and-forget
        void this.automationService
          .evaluateAndRun({
            conversationId,
            contactId,
            messageContent: body ?? '',
            messageType: type,
            isFirstMessage,
            isOutsideHours,
            channel: 'WhatsApp',
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Automation error: ${msg}`);
          });
      } catch (autoErr) {
        this.logger.error('Automation setup failed', autoErr);
      }
    } catch (err) {
      this.logger.error('Failed to process incoming WhatsApp payload', err);
    }
  }

  // ── Step 2: Upsert contact ───────────────────────────────────────────────

  private async upsertContact(phone: string, name?: string): Promise<string> {
    const db = this.supabaseService.getClient();
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

  // ── Step 3: Upsert conversation ──────────────────────────────────────────

  private async upsertConversation(contactId: string): Promise<string> {
    const db = this.supabaseService.getClient();
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

  // ── Step 4: Save inbound message ─────────────────────────────────────────

  private async saveMessage(
    conversationId: string,
    waMessageId: string,
    type: string,
    content?: string,
  ): Promise<string | null> {
    const db = this.supabaseService.getClient();

    const { data, error } = await db
      .from('messages')
      .insert({
        conversation_id: conversationId,
        wa_message_id: waMessageId,
        direction: 'inbound',
        type,
        content: content ?? null,
        media_url: null, // Filled in by AttachmentsService after media download
        status: 'delivered',
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`saveMessage failed: ${error.message}`);
      return null;
    }
    return (data?.id as string) ?? null;
  }

  // ── Step 5: Handle delivery status updates ───────────────────────────────

  private async handleStatusUpdate(status: Record<string, unknown>): Promise<void> {
    const db = this.supabaseService.getClient();
    const waMessageId = status.id as string;
    const newStatus = status.status as string;

    if (!['sent', 'delivered', 'read', 'failed'].includes(newStatus)) return;

    const { error } = await db
      .from('messages')
      .update({ status: newStatus })
      .eq('wa_message_id', waMessageId);

    if (error) {
      this.logger.error(`handleStatusUpdate failed for ${waMessageId}: ${error.message}`);
    } else {
      this.logger.log(`[STATUS] ${waMessageId} → ${newStatus}`);
    }
  }
}
