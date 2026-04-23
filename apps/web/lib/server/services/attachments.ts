import type { Attachment, AttachmentFileType } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { requireEnv } from '../env';
import { BadRequestError, NotFoundError } from '../errors';

const BUCKET = 'attachments';

export interface FindAllFilters {
  file_type?: AttachmentFileType;
  contact_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface AttachmentWithContact extends Attachment {
  contact: { id: string; name: string | null; phone: string } | null;
}

function mapWithContact(
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

export async function findAllAttachments(
  filters?: FindAllFilters,
): Promise<AttachmentWithContact[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from('attachments')
    .select('*, contacts(id, name, phone)')
    .order('created_at', { ascending: false });
  if (filters?.file_type) query = query.eq('file_type', filters.file_type);
  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id);
  if (filters?.date_from) query = query.gte('created_at', filters.date_from);
  if (filters?.date_to) query = query.lte('created_at', filters.date_to);
  const { data, error } = await query;
  if (error) throw new BadRequestError(error.message);
  return mapWithContact(data);
}

export async function searchAttachments(
  q: string,
  filters?: { file_type?: AttachmentFileType },
): Promise<AttachmentWithContact[]> {
  if (!q || !q.trim()) return [];
  const db = getSupabaseAdmin();
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
    console.warn(`textSearch failed, falling back to ilike: ${error.message}`);
    let fb = db
      .from('attachments')
      .select('*, contacts(id, name, phone)')
      .or(`extracted_text.ilike.%${q}%,file_name.ilike.%${q}%`)
      .order('created_at', { ascending: false });
    if (filters?.file_type) fb = fb.eq('file_type', filters.file_type);
    const { data: fbData, error: fbErr } = await fb;
    if (fbErr) throw new BadRequestError(fbErr.message);
    return mapWithContact(fbData);
  }
  return mapWithContact(data);
}

export async function findAttachment(id: string): Promise<AttachmentWithContact> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('attachments')
    .select('*, contacts(id, name, phone)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Attachment ${id} not found`);
  return mapWithContact([data])[0];
}

export async function deleteAttachment(id: string) {
  const db = getSupabaseAdmin();
  const { data: attachment, error: fetchErr } = await db
    .from('attachments')
    .select('id, storage_path')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw new BadRequestError(fetchErr.message);
  if (!attachment) throw new NotFoundError(`Attachment ${id} not found`);
  if (attachment.storage_path) {
    const { error: storageErr } = await db.storage
      .from(BUCKET)
      .remove([attachment.storage_path as string]);
    if (storageErr) {
      console.warn(
        `Storage delete failed for ${attachment.storage_path}: ${storageErr.message}`,
      );
    }
  }
  const { error: deleteErr } = await db.from('attachments').delete().eq('id', id);
  if (deleteErr) throw new BadRequestError(deleteErr.message);
  return { success: true };
}

export async function getAttachmentDownloadUrl(id: string) {
  const db = getSupabaseAdmin();
  const { data: attachment, error } = await db
    .from('attachments')
    .select('id, storage_path, media_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!attachment) throw new NotFoundError(`Attachment ${id} not found`);
  if (!attachment.storage_path) {
    throw new BadRequestError('Attachment has no storage_path');
  }
  const { data: signed, error: signErr } = await db.storage
    .from(BUCKET)
    .createSignedUrl(attachment.storage_path as string, 3600);
  if (signErr || !signed) {
    throw new BadRequestError(
      signErr?.message ?? 'Failed to create signed URL',
    );
  }
  return {
    url: signed.signedUrl,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  };
}

export async function bulkDownloadAttachmentUrls(ids: string[]) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('attachments')
    .select('id, storage_path, file_name')
    .in('id', ids);
  if (error) throw new BadRequestError(error.message);
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

function classifyFileType(mime: string): AttachmentFileType {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

function extensionForMime(mime: string): string {
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

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (
      b: Buffer,
    ) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return (result?.text ?? '').trim() || null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`pdf-parse failed: ${msg}`);
    return null;
  }
}

async function extractImageText(buffer: Buffer): Promise<string | null> {
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
    console.warn(`tesseract failed: ${msg}`);
    return null;
  }
}

export async function processMediaFromWebhook(
  mediaId: string,
  messageId: string,
  contactId: string,
  mimeType: string,
  providedFileName?: string,
): Promise<Attachment | null> {
  try {
    const accessToken = requireEnv('META_ACCESS_TOKEN');

    // Step 1: Resolve media URL from Meta
    const metaMetaRes = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metaMetaRes.ok) {
      console.warn(`Media ${mediaId}: metadata fetch ${metaMetaRes.status}`);
      return null;
    }
    const metaData = (await metaMetaRes.json()) as {
      url: string;
      mime_type: string;
      file_size: number;
    };

    const fileUrl = metaData?.url;
    const effectiveMime = metaData?.mime_type ?? mimeType;
    const fileSize = metaData?.file_size ?? null;
    if (!fileUrl) {
      console.warn(`Media ${mediaId}: no URL returned from Meta`);
      return null;
    }

    // Step 2: Download the binary
    const fileRes = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) {
      console.warn(`Media ${mediaId}: download ${fileRes.status}`);
      return null;
    }
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer());

    // Step 3: Classify + filename
    const fileType = classifyFileType(effectiveMime);
    const extension = extensionForMime(effectiveMime);
    const fileName = providedFileName ?? `${messageId}.${extension}`;
    const storagePath = `${contactId}/${messageId}/${fileName}`;

    // Step 4: Upload to Supabase Storage
    const db = getSupabaseAdmin();
    const { error: uploadErr } = await db.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: effectiveMime,
        upsert: true,
      });
    if (uploadErr) {
      console.error(`Storage upload failed: ${uploadErr.message}`);
      return null;
    }

    // Step 5: Extract text
    let extractedText: string | null = null;
    try {
      if (fileType === 'document' && effectiveMime === 'application/pdf') {
        extractedText = await extractPdfText(fileBuffer);
      } else if (fileType === 'image') {
        extractedText = await extractImageText(fileBuffer);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Text extraction failed for ${mediaId}: ${msg}`);
    }

    // Step 6: Public URL
    const { data: publicData } = db.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;

    // Step 7: Insert attachment row
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
      console.error(`Insert attachment failed: ${insertErr.message}`);
      return null;
    }

    // Step 8: Update message row
    await db
      .from('messages')
      .update({ media_url: publicUrl, media_mime: effectiveMime })
      .eq('id', messageId);

    console.log(
      `[MEDIA] Processed ${mediaId} → ${fileType}/${effectiveMime} (${fileSize ?? '?'} bytes)`,
    );
    return inserted as Attachment;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`processMediaFromWebhook failed for ${mediaId}: ${msg}`);
    return null;
  }
}

export function parseAttachmentFilters(sp: URLSearchParams): FindAllFilters {
  return {
    file_type: (sp.get('file_type') as AttachmentFileType | null) ?? undefined,
    contact_id: sp.get('contact_id') ?? undefined,
    date_from: sp.get('date_from') ?? undefined,
    date_to: sp.get('date_to') ?? undefined,
  };
}
