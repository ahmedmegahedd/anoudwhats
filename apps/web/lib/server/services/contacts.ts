import type { Contact } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../errors';

export interface ContactFilters {
  search?: string;
  channel?: string | string[];
  source?: string | string[];
  campaign_id?: string;
  pipeline_stage?: string | string[];
  assigned_agent_id?: string;
  tag?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateContactInput {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  channel?: string;
  source?: string;
  campaign_id?: string;
  tags?: string[];
  pipeline_stage?: string;
  deal_value?: number;
  assigned_agent_id?: string;
}

export type UpdateContactInput = Partial<CreateContactInput>;

export interface ContactRow extends Contact {
  campaign: { id: string; name: string } | null;
  agent: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface ContactsPage {
  data: ContactRow[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_LIMIT = 50;
const SELECT =
  '*, campaign:campaigns(id, name), agent:profiles!contacts_assigned_agent_id_fkey(id, full_name, avatar_url)';

function applyEqOrIn<T extends { eq: unknown; in: unknown }>(
  query: T,
  column: string,
  value: string | string[] | undefined,
): T {
  if (!value) return query;
  if (Array.isArray(value)) {
    if (value.length === 0) return query;
    return (query as unknown as {
      in: (col: string, vals: string[]) => T;
    }).in(column, value);
  }
  return (query as unknown as {
    eq: (col: string, val: string) => T;
  }).eq(column, value);
}

export async function findAllContacts(
  filters: ContactFilters = {},
): Promise<ContactsPage> {
  const db = getSupabaseAdmin();
  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, 200);
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .from('contacts')
    .select(SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.search?.trim()) {
    const s = filters.search.trim().replace(/[%_]/g, '');
    query = query.or(
      `name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`,
    );
  }
  query = applyEqOrIn(query, 'channel', filters.channel);
  query = applyEqOrIn(query, 'source', filters.source);
  query = applyEqOrIn(query, 'pipeline_stage', filters.pipeline_stage);
  if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
  if (filters.assigned_agent_id) {
    query = query.eq('assigned_agent_id', filters.assigned_agent_id);
  }
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);

  const { data, error, count } = await query;
  if (error) throw new BadRequestError(error.message);

  return {
    data: (data ?? []) as unknown as ContactRow[],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function findContact(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('contacts')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Contact ${id} not found`);
  const contact = data as unknown as ContactRow;

  const { data: conversations } = await db
    .from('conversations')
    .select('id, status, created_at, last_message_at')
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  const convList = [] as Array<{
    id: string;
    status: string;
    created_at: string;
    last_message_at: string | null;
    message_count: number;
    last_message: { content: string | null; created_at: string } | null;
  }>;
  for (const conv of conversations ?? []) {
    const { count: msgCount } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id as string);
    const { data: lastMsg } = await db
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conv.id as string)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    convList.push({
      id: conv.id as string,
      status: conv.status as string,
      created_at: conv.created_at as string,
      last_message_at: (conv.last_message_at as string | null) ?? null,
      message_count: msgCount ?? 0,
      last_message: lastMsg
        ? {
            content: (lastMsg.content as string | null) ?? null,
            created_at: lastMsg.created_at as string,
          }
        : null,
    });
  }

  const { count: attTotal } = await db
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', id);
  const { data: recentAtt } = await db
    .from('attachments')
    .select('id, file_name, file_type, media_url, created_at')
    .eq('contact_id', id)
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    ...contact,
    conversations: convList,
    attachments: {
      total: attTotal ?? 0,
      recent: (recentAtt ?? []).map((row) => ({
        id: row.id as string,
        file_name: (row.file_name as string | null) ?? null,
        file_type: (row.file_type as string | null) ?? null,
        media_url: (row.media_url as string | null) ?? null,
        created_at: row.created_at as string,
      })),
    },
  };
}

export async function createContact(dto: CreateContactInput): Promise<Contact> {
  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from('contacts')
    .select('id')
    .eq('phone', dto.phone)
    .maybeSingle();
  if (existing) throw new ConflictError(`Phone ${dto.phone} already exists`);

  const { data, error } = await db
    .from('contacts')
    .insert({
      phone: dto.phone,
      name: dto.name ?? null,
      email: dto.email ?? null,
      company: dto.company ?? null,
      channel: dto.channel ?? null,
      source: dto.source ?? null,
      campaign_id: dto.campaign_id ?? null,
      tags: dto.tags ?? [],
      pipeline_stage: dto.pipeline_stage ?? 'Lead',
      deal_value: dto.deal_value ?? null,
      assigned_agent_id: dto.assigned_agent_id ?? null,
    })
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  return data as Contact;
}

export async function updateContact(
  id: string,
  dto: UpdateContactInput,
): Promise<Contact> {
  const db = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (dto.phone !== undefined) patch.phone = dto.phone;
  if (dto.name !== undefined) patch.name = dto.name;
  if (dto.email !== undefined) patch.email = dto.email;
  if (dto.company !== undefined) patch.company = dto.company;
  if (dto.channel !== undefined) patch.channel = dto.channel;
  if (dto.source !== undefined) patch.source = dto.source;
  if (dto.campaign_id !== undefined) patch.campaign_id = dto.campaign_id;
  if (dto.tags !== undefined) patch.tags = dto.tags;
  if (dto.pipeline_stage !== undefined) patch.pipeline_stage = dto.pipeline_stage;
  if (dto.deal_value !== undefined) patch.deal_value = dto.deal_value;
  if (dto.assigned_agent_id !== undefined) {
    patch.assigned_agent_id = dto.assigned_agent_id;
  }
  const { data, error } = await db
    .from('contacts')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Contact ${id} not found`);
  return data as Contact;
}

export async function deleteContact(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('contacts').delete().eq('id', id);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}

export async function bulkDeleteContacts(ids: string[]) {
  const db = getSupabaseAdmin();
  const { error, count } = await db
    .from('contacts')
    .delete({ count: 'exact' })
    .in('id', ids);
  if (error) throw new BadRequestError(error.message);
  return { deleted: count ?? 0 };
}

export async function addContactTag(id: string, tag: string) {
  const clean = tag.trim();
  if (!clean) throw new BadRequestError('Tag cannot be empty');
  const db = getSupabaseAdmin();
  const { data: current, error: fetchErr } = await db
    .from('contacts')
    .select('tags')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw new BadRequestError(fetchErr.message);
  if (!current) throw new NotFoundError(`Contact ${id} not found`);
  const existing = ((current.tags as string[]) ?? []) as string[];
  if (existing.includes(clean)) return existing;
  const next = [...existing, clean];
  const { error: updateErr } = await db
    .from('contacts')
    .update({ tags: next })
    .eq('id', id);
  if (updateErr) throw new BadRequestError(updateErr.message);
  return next;
}

export async function removeContactTag(id: string, tag: string) {
  const db = getSupabaseAdmin();
  const { data: current, error: fetchErr } = await db
    .from('contacts')
    .select('tags')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw new BadRequestError(fetchErr.message);
  if (!current) throw new NotFoundError(`Contact ${id} not found`);
  const existing = ((current.tags as string[]) ?? []) as string[];
  const next = existing.filter((t) => t !== tag);
  const { error: updateErr } = await db
    .from('contacts')
    .update({ tags: next })
    .eq('id', id);
  if (updateErr) throw new BadRequestError(updateErr.message);
  return next;
}

export async function getContactStats() {
  const db = getSupabaseAdmin();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [totalRes, todayRes, weekRes, breakdownRes] = await Promise.all([
    db.from('contacts').select('id', { count: 'exact', head: true }),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString()),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString()),
    db
      .from('contacts')
      .select('channel, source, pipeline_stage, campaign_id, campaigns(name)'),
  ]);

  const byChannel = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byStage = new Map<string, number>();
  const byCampaign = new Map<string, number>();

  for (const row of (breakdownRes.data ?? []) as Array<Record<string, unknown>>) {
    const ch = (row.channel as string) || 'Unknown';
    const src = (row.source as string) || 'Unknown';
    const stg = (row.pipeline_stage as string) || 'Lead';
    byChannel.set(ch, (byChannel.get(ch) ?? 0) + 1);
    bySource.set(src, (bySource.get(src) ?? 0) + 1);
    byStage.set(stg, (byStage.get(stg) ?? 0) + 1);
    const camp = row.campaigns as { name: string } | null;
    if (camp?.name) byCampaign.set(camp.name, (byCampaign.get(camp.name) ?? 0) + 1);
  }

  const toSorted = (m: Map<string, number>) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

  return {
    total: totalRes.count ?? 0,
    newToday: todayRes.count ?? 0,
    newThisWeek: weekRes.count ?? 0,
    byChannel: toSorted(byChannel).map(([channel, count]) => ({ channel, count })),
    bySource: toSorted(bySource).map(([source, count]) => ({ source, count })),
    byCampaign: toSorted(byCampaign)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    byStage: toSorted(byStage).map(([stage, count]) => ({ stage, count })),
  };
}

export async function getContactChannels() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('contacts')
    .select('channel')
    .not('channel', 'is', null);
  if (error) throw new BadRequestError(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const v = (row as { channel: string | null }).channel;
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

export async function getContactSources() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('contacts')
    .select('source')
    .not('source', 'is', null);
  if (error) throw new BadRequestError(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const v = (row as { source: string | null }).source;
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

function csv(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportContactsCsv(
  filters: ContactFilters = {},
): Promise<string> {
  const all = await findAllContacts({ ...filters, page: 1, limit: 10_000 });
  const headers = [
    'name',
    'phone',
    'email',
    'company',
    'channel',
    'source',
    'campaign',
    'pipeline_stage',
    'deal_value',
    'tags',
    'created_at',
  ];
  const lines: string[] = [headers.join(',')];
  for (const c of all.data) {
    const row = [
      csv(c.name),
      csv(c.phone),
      csv(c.email),
      csv(c.company),
      csv(c.channel),
      csv(c.source),
      csv(c.campaign?.name ?? null),
      csv(c.pipeline_stage),
      csv(c.deal_value !== null ? String(c.deal_value) : null),
      csv((c.tags ?? []).join('; ')),
      csv(c.created_at),
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export function parseContactFilters(
  sp: URLSearchParams,
): ContactFilters {
  const filters: ContactFilters = {};
  const get = (k: string) => sp.get(k) ?? undefined;
  const splitMulti = (v: string) =>
    v.includes(',') ? v.split(',').filter(Boolean) : v;

  if (get('search')) filters.search = get('search');
  if (get('channel')) filters.channel = splitMulti(get('channel')!);
  if (get('source')) filters.source = splitMulti(get('source')!);
  if (get('campaign_id')) filters.campaign_id = get('campaign_id');
  if (get('pipeline_stage')) {
    filters.pipeline_stage = splitMulti(get('pipeline_stage')!);
  }
  if (get('assigned_agent_id')) filters.assigned_agent_id = get('assigned_agent_id');
  if (get('tag')) filters.tag = get('tag');
  if (get('date_from')) filters.date_from = get('date_from');
  if (get('date_to')) filters.date_to = get('date_to');
  if (get('page')) filters.page = Number(get('page'));
  if (get('limit')) filters.limit = Number(get('limit'));
  return filters;
}
