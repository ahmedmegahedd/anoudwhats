import type { WaTemplate, InternalTemplate } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { getEnv, requireEnv } from '../env';
import { metaFetch } from '../meta';
import { BadRequestError, NotFoundError } from '../errors';

interface WaTemplateFilters {
  status?: string;
  category?: string;
  language?: string;
}

interface InternalTemplateFilters {
  category?: string;
  language?: string;
  is_auto?: boolean;
}

interface MetaTemplate {
  id: string;
  name: string;
  category?: string;
  status?: string;
  language?: string;
  components?: unknown;
}

export interface CreateInternalTemplateInput {
  title: string;
  content: string;
  category?: string;
  language?: 'en' | 'ar';
  is_auto?: boolean;
  trigger_rule?: Record<string, unknown>;
}

export type UpdateInternalTemplateInput = Partial<CreateInternalTemplateInput>;

export async function syncTemplatesFromMeta(): Promise<{
  synced: number;
  total: number;
}> {
  const wabaId = getEnv('META_WABA_ID');
  requireEnv('META_ACCESS_TOKEN');
  if (!wabaId) {
    throw new BadRequestError(
      'META_WABA_ID is not configured. Add it to your env',
    );
  }
  let metaTemplates: MetaTemplate[] = [];
  try {
    const data = await metaFetch<{ data: MetaTemplate[] }>(
      `/${wabaId}/message_templates?limit=100`,
    );
    metaTemplates = data?.data ?? [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BadRequestError(`Meta API error: ${msg}`);
  }

  const total = metaTemplates.length;
  if (total === 0) return { synced: 0, total: 0 };

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const rows = metaTemplates.map((t) => ({
    meta_id: t.id,
    name: t.name,
    category: t.category ?? null,
    status: t.status ?? null,
    language: t.language ?? null,
    components: (t.components ?? null) as unknown as Record<string, unknown> | null,
    last_synced_at: now,
  }));

  const { error } = await db
    .from('wa_templates')
    .upsert(rows, { onConflict: 'meta_id' });
  if (error) {
    throw new BadRequestError(`Failed to upsert templates: ${error.message}`);
  }

  console.log(`[TEMPLATES] Synced ${total} templates from Meta`);
  return { synced: total, total };
}

export async function findAllWaTemplates(
  filters?: WaTemplateFilters,
): Promise<WaTemplate[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from('wa_templates')
    .select('*')
    .order('name', { ascending: true });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.language) query = query.eq('language', filters.language);
  const { data, error } = await query;
  if (error) throw new BadRequestError(error.message);
  return (data ?? []) as WaTemplate[];
}

export async function findWaTemplate(id: string): Promise<WaTemplate> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('wa_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`WA template ${id} not found`);
  return data as WaTemplate;
}

export async function deleteWaTemplate(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('wa_templates').delete().eq('id', id);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}

export async function findAllInternalTemplates(
  filters?: InternalTemplateFilters,
): Promise<InternalTemplate[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from('internal_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.language) query = query.eq('language', filters.language);
  if (typeof filters?.is_auto === 'boolean') {
    query = query.eq('is_auto', filters.is_auto);
  }
  const { data, error } = await query;
  if (error) throw new BadRequestError(error.message);
  return (data ?? []) as InternalTemplate[];
}

export async function findInternalTemplate(
  id: string,
): Promise<InternalTemplate> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('internal_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Internal template ${id} not found`);
  return data as InternalTemplate;
}

export async function createInternalTemplate(
  dto: CreateInternalTemplateInput,
): Promise<InternalTemplate> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('internal_templates')
    .insert({
      title: dto.title,
      content: dto.content,
      category: dto.category ?? null,
      language: dto.language ?? 'en',
      is_auto: dto.is_auto ?? false,
      trigger_rule: dto.trigger_rule ?? null,
    })
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  return data as InternalTemplate;
}

export async function updateInternalTemplate(
  id: string,
  dto: UpdateInternalTemplateInput,
): Promise<InternalTemplate> {
  const db = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (dto.title !== undefined) patch.title = dto.title;
  if (dto.content !== undefined) patch.content = dto.content;
  if (dto.category !== undefined) patch.category = dto.category;
  if (dto.language !== undefined) patch.language = dto.language;
  if (dto.is_auto !== undefined) patch.is_auto = dto.is_auto;
  if (dto.trigger_rule !== undefined) patch.trigger_rule = dto.trigger_rule;
  const { data, error } = await db
    .from('internal_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Internal template ${id} not found`);
  return data as InternalTemplate;
}

export async function deleteInternalTemplate(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('internal_templates').delete().eq('id', id);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}
