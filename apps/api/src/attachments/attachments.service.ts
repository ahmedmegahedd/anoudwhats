import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import type { Attachment, AttachmentFileType } from '@anoud-job/types';

const BUCKET = 'attachments';

interface FindAllFilters {
  file_type?: AttachmentFileType;
  contact_id?: string;
  date_from?: string;
  date_to?: string;
}

interface SearchFilters {
  file_type?: AttachmentFileType;
}

export interface AttachmentWithContact extends Attachment {
  contact: { id: string; name: string | null; phone: string } | null;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════
  // ── Queries ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async findAll(filters?: FindAllFilters): Promise<AttachmentWithContact[]> {
    const db = this.supabaseService.getClient();
    let query = db
      .from('attachments')
      .select('*, contacts(id, name, phone)')
      .order('created_at', { ascending: false });

    if (filters?.file_type) query = query.eq('file_type', filters.file_type);
    if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id);
    if (filters?.date_from) query = query.gte('created_at', filters.date_from);
    if (filters?.date_to) query = query.lte('created_at', filters.date_to);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return this.mapWithContact(data);
  }

  async search(
    q: string,
    filters?: SearchFilters,
  ): Promise<AttachmentWithContact[]> {
    if (!q || !q.trim()) return [];
    const db = this.supabaseService.getClient();
    let query = db
      .from('attachments')
      .select('*, contacts(id, name, phone)')
      .textSearch('extracted_text_and_name', q, {
        type: 'websearch',
        config: 'simple',
      })
      .order('created_at', { ascending: false });

    if (filters?.file_type) query = query.eq('file_type', filters.file_type);

    const { data, error } = await query;
    if (error) {
      // Fallback to ilike if text search fails
      this.logger.warn(`textSearch failed, falling back to ilike: ${error.message}`);
      let fb = db
        .from('attachments')
        .select('*, contacts(id, name, phone)')
        .or(`extracted_text.ilike.%${q}%,file_name.ilike.%${q}%`)
        .order('created_at', { ascending: false });
      if (filters?.file_type) fb = fb.eq('file_type', filters.file_type);
      const { data: fbData, error: fbErr } = await fb;
      if (fbErr) throw new BadRequestException(fbErr.message);
      return this.mapWithContact(fbData);
    }
    return this.mapWithContact(data);
  }

  async findOne(id: string): Promise<AttachmentWithContact> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('attachments')
      .select('*, contacts(id, name, phone)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Attachment ${id} not found`);
    return this.mapWithContact([data])[0];
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const db = this.supabaseService.getClient();
    const { data: attachment, error: fetchErr } = await db
      .from('attachments')
      .select('id, storage_path')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new BadRequestException(fetchErr.message);
    if (!attachment) throw new NotFoundException(`Attachment ${id} not found`);

    if (attachment.storage_path) {
      const { error: storageErr } = await db.storage
        .from(BUCKET)
        .remove([attachment.storage_path as string]);
      if (storageErr) {
        this.logger.warn(
          `Storage delete failed for ${attachment.storage_path}: ${storageErr.message}`,
        );
      }
    }

    const { error: deleteErr } = await db.from('attachments').delete().eq('id', id);
    if (deleteErr) throw new BadRequestException(deleteErr.message);
    return { success: true };
  }

  async getDownloadUrl(id: string): Promise<{ url: string; expires_at: string }> {
    const db = this.supabaseService.getClient();
    const { data: attachment, error } = await db
      .from('attachments')
      .select('id, storage_path, media_url')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!attachment) throw new NotFoundException(`Attachment ${id} not found`);
    if (!attachment.storage_path) {
      throw new BadRequestException('Attachment has no storage_path');
    }

    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storage_path as string, 3600);
    if (signErr || !signed) {
      throw new BadRequestException(signErr?.message ?? 'Failed to create signed URL');
    }

    return {
      url: signed.signedUrl,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  async bulkDownloadUrls(
    ids: string[],
  ): Promise<Array<{ id: string; url: string; file_name: string | null }>> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('attachments')
      .select('id, storage_path, file_name')
      .in('id', ids);
    if (error) throw new BadRequestException(error.message);

    const results: Array<{ id: string; url: string; file_name: string | null }> = [];
    for (const row of data ?? []) {
      if (!row.storage_path) continue;
      const { data: signed } = await db.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path as string, 3600);
      if (signed?.signedUrl) {
        results.push({
          id: row.id as string,
          url: signed.signedUrl,
          file_name: (row.file_name as string | null) ?? null,
        });
      }
    }
    return results;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Webhook media processing ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async processMediaFromWebhook(
    mediaId: string,
    messageId: string,
    contactId: string,
    mimeType: string,
    providedFileName?: string,
  ): Promise<Attachment | null> {
    try {
      const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');

      // ── Step 1: Resolve media URL from Meta ───────────────────────────
      const metaMetaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
      const { data: metaData } = await firstValueFrom(
        this.httpService.get<{ url: string; mime_type: string; file_size: number }>(
          metaMetaUrl,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      const fileUrl = metaData?.url;
      const effectiveMime = metaData?.mime_type ?? mimeType;
      const fileSize = metaData?.file_size ?? null;
      if (!fileUrl) {
        this.logger.warn(`Media ${mediaId}: no URL returned from Meta`);
        return null;
      }

      // ── Step 2: Download the binary ──────────────────────────────────
      const { data: buffer } = await firstValueFrom(
        this.httpService.get<ArrayBuffer>(fileUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        }),
      );
      const fileBuffer = Buffer.from(buffer);

      // ── Step 3: Classify file type + filename ────────────────────────
      const fileType = this.classifyFileType(effectiveMime);
      const extension = this.extensionForMime(effectiveMime);
      const fileName = providedFileName ?? `${messageId}.${extension}`;
      const storagePath = `${contactId}/${messageId}/${fileName}`;

      // ── Step 4: Upload to Supabase Storage ───────────────────────────
      const db = this.supabaseService.getClient();
      const { error: uploadErr } = await db.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: effectiveMime,
          upsert: true,
        });
      if (uploadErr) {
        this.logger.error(`Storage upload failed: ${uploadErr.message}`);
        return null;
      }

      // ── Step 5: Extract text (fire-and-forget friendly) ──────────────
      let extractedText: string | null = null;
      try {
        if (fileType === 'document' && effectiveMime === 'application/pdf') {
          extractedText = await this.extractPdfText(fileBuffer);
        } else if (fileType === 'image') {
          extractedText = await this.extractImageText(fileBuffer);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Text extraction failed for ${mediaId}: ${msg}`);
      }

      // ── Step 6: Public URL ───────────────────────────────────────────
      const { data: publicData } = db.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;

      // ── Step 7: Insert attachment row ────────────────────────────────
      const { data: inserted, error: insertErr } = await db
        .from('attachments')
        .insert({
          message_id: messageId,
          contact_id: contactId,
          file_name: fileName,
          file_type: fileType,
          mime_type: effectiveMime,
          storage_path: storagePath,
          file_size: fileSize,
          extracted_text: extractedText,
          media_url: publicUrl,
        })
        .select()
        .single();
      if (insertErr) {
        this.logger.error(`Insert attachment failed: ${insertErr.message}`);
        return null;
      }

      // ── Step 8: Update the related message row ───────────────────────
      await db
        .from('messages')
        .update({ media_url: publicUrl, media_mime: effectiveMime })
        .eq('id', messageId);

      this.logger.log(
        `[MEDIA] Processed ${mediaId} → ${fileType}/${effectiveMime} (${fileSize ?? '?'} bytes)`,
      );
      return inserted as Attachment;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`processMediaFromWebhook failed for ${mediaId}: ${msg}`);
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Helpers ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  private classifyFileType(mime: string): AttachmentFileType {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }

  private extensionForMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/3gpp': '3gp',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/amr': 'amr',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt',
    };
    return map[mime] ?? 'bin';
  }

  private async extractPdfText(buffer: Buffer): Promise<string | null> {
    try {
      // Lazy-require to avoid pdf-parse's top-level test-file read issue
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (
        b: Buffer,
      ) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      return (result?.text ?? '').trim() || null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`pdf-parse failed: ${msg}`);
      return null;
    }
  }

  private async extractImageText(buffer: Buffer): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Tesseract = require('tesseract.js') as {
        recognize: (
          img: Buffer,
          lang: string,
        ) => Promise<{ data: { text: string } }>;
      };
      const {
        data: { text },
      } = await Tesseract.recognize(buffer, 'eng+ara');
      return (text ?? '').trim() || null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`tesseract failed: ${msg}`);
      return null;
    }
  }

  private mapWithContact(
    rows: Record<string, unknown>[] | null,
  ): AttachmentWithContact[] {
    return (rows ?? []).map((row) => {
      const contact = row.contacts as
        | { id: string; name: string | null; phone: string }
        | null;
      const { contacts: _removed, ...rest } = row as Record<string, unknown>;
      void _removed;
      return {
        ...(rest as unknown as Attachment),
        contact: contact ?? null,
      };
    });
  }
}
