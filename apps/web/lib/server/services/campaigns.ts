import { randomUUID } from 'crypto';
import type { Campaign } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { BadRequestError, NotFoundError } from '../errors';
import { sendWhatsAppText, sendWhatsAppTemplate } from '../meta';

export interface CampaignFilters {
  search?: string;
  channel?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateCampaignInput {
  name: string;
  channel?: string;
  source?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

export interface SendBulkMessageInput {
  type: 'text' | 'template';
  message?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: unknown[];
}

export interface BulkJobStatus {
  jobId: string;
  status: 'processing' | 'done' | 'failed';
  sent: number;
  failed: number;
  total: number;
  errors: string[];
}

const STAGES = [
  'Lead',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
];

// In-memory job tracking — only works on a single long-running Node process.
// Since this is deployed as one Render service with persistent Node runtime,
// this is fine. If you ever move to serverless, swap to DB/Redis.
const bulkJobs = new Map<string, BulkJobStatus>();

export async function findAllCampaigns(filters: CampaignFilters = {}) {
  const db = getSupabaseAdmin();
  let query = db
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.search?.trim()) {
    const s = filters.search.trim().replace(/[%_]/g, '');
    query = query.ilike('name', `%${s}%`);
  }
  if (filters.channel) query = query.eq('channel', filters.channel);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.date_from) query = query.gte('start_date', filters.date_from);
  if (filters.date_to) query = query.lte('end_date', filters.date_to);

  const { data, error } = await query;
  if (error) throw new BadRequestError(error.message);

  const rows = (data ?? []) as Campaign[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const creatorIds = Array.from(
    new Set(rows.map((r) => r.created_by).filter((v): v is string => !!v)),
  );

  const statsMap = new Map<
    string,
    { lead_count: number; won_count: number; total_value: number }
  >();
  for (const row of rows) {
    statsMap.set(row.id, { lead_count: 0, won_count: 0, total_value: 0 });
  }

  const { data: contacts } = await db
    .from('contacts')
    .select('campaign_id, pipeline_stage, deal_value')
    .in('campaign_id', ids);
  for (const c of contacts ?? []) {
    const id = c.campaign_id as string;
    const stats = statsMap.get(id);
    if (!stats) continue;
    stats.lead_count++;
    if ((c.pipeline_stage as string) === 'Won') stats.won_count++;
    stats.total_value += (c.deal_value as number | null) ?? 0;
  }

  const creatorMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);
    for (const p of profiles ?? []) {
      creatorMap.set(p.id as string, (p.full_name as string) ?? '');
    }
  }

  return rows.map((row) => {
    const stats = statsMap.get(row.id) ?? {
      lead_count: 0,
      won_count: 0,
      total_value: 0,
    };
    return {
      ...row,
      ...stats,
      created_by_name: row.created_by
        ? creatorMap.get(row.created_by) ?? null
        : null,
    };
  });
}

export async function findCampaign(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Campaign ${id} not found`);

  const { data: leadsData } = await db
    .from('contacts')
    .select(
      'id, name, phone, email, company, pipeline_stage, deal_value, assigned_agent_id, channel, source, last_seen_at',
    )
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(500);

  const leads = (leadsData ?? []) as Array<{
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    company: string | null;
    pipeline_stage: string;
    deal_value: number | null;
    assigned_agent_id: string | null;
    channel: string | null;
    source: string | null;
    last_seen_at: string | null;
  }>;

  const totalLeads = leads.length;
  const stageCounts = new Map<string, number>();
  for (const stage of STAGES) stageCounts.set(stage, 0);
  let totalValue = 0;
  let wonValue = 0;
  let wonCount = 0;
  for (const lead of leads) {
    const stage = lead.pipeline_stage ?? 'Lead';
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    totalValue += lead.deal_value ?? 0;
    if (stage === 'Won') {
      wonCount++;
      wonValue += lead.deal_value ?? 0;
    }
  }
  const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;

  return {
    ...(data as Campaign),
    analytics: {
      totalLeads,
      byStage: STAGES.map((stage) => ({
        stage,
        count: stageCounts.get(stage) ?? 0,
      })),
      conversionRate,
      totalValue,
      wonValue,
    },
    leads,
  };
}

export async function createCampaign(dto: CreateCampaignInput): Promise<Campaign> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('campaigns')
    .insert({
      name: dto.name,
      channel: dto.channel ?? null,
      source: dto.source ?? null,
      budget: dto.budget ?? null,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
    })
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  return data as Campaign;
}

export async function updateCampaign(
  id: string,
  dto: UpdateCampaignInput,
): Promise<Campaign> {
  const db = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (dto.name !== undefined) patch.name = dto.name;
  if (dto.channel !== undefined) patch.channel = dto.channel;
  if (dto.source !== undefined) patch.source = dto.source;
  if (dto.budget !== undefined) patch.budget = dto.budget;
  if (dto.start_date !== undefined) patch.start_date = dto.start_date;
  if (dto.end_date !== undefined) patch.end_date = dto.end_date;
  const { data, error } = await db
    .from('campaigns')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Campaign ${id} not found`);
  return data as Campaign;
}

export async function deleteCampaign(id: string) {
  const db = getSupabaseAdmin();
  await db.from('contacts').update({ campaign_id: null }).eq('campaign_id', id);
  const { error } = await db.from('campaigns').delete().eq('id', id);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}

function normalizePhone(raw: string): string | null {
  let phone = raw.replace(/[^\d+]/g, '');
  if (!phone) return null;
  if (phone.startsWith('0') && phone.length === 11) {
    phone = `20${phone.slice(1)}`;
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 8) return null;
  return phone;
}

export async function importLeads(campaignId: string, buffer: Buffer) {
  const db = getSupabaseAdmin();
  const { data: campaign } = await db
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) throw new NotFoundError(`Campaign ${campaignId} not found`);

  // Lazy import xlsx (heavy dep, only needed for imports)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');

  let rows: Record<string, unknown>[];
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('Empty workbook');
    rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BadRequestError(`Failed to parse file: ${msg}`);
  }

  const result = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      const rawPhone = String(row.phone ?? row.Phone ?? '').trim();
      const name = String(row.name ?? row.Name ?? '').trim();
      if (!rawPhone) {
        result.skipped++;
        result.errors.push(`Row ${rowNum}: missing phone`);
        continue;
      }
      if (!name) {
        result.skipped++;
        result.errors.push(`Row ${rowNum}: missing name`);
        continue;
      }
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        result.skipped++;
        result.errors.push(`Row ${rowNum}: invalid phone "${rawPhone}"`);
        continue;
      }
      const email = row.email ?? row.Email;
      const company = row.company ?? row.Company;
      const dealValueRaw = row.deal_value ?? row['Deal Value'] ?? row.dealValue;
      const dealValue =
        dealValueRaw !== undefined && dealValueRaw !== ''
          ? Number(dealValueRaw)
          : null;

      const { data: existing } = await db
        .from('contacts')
        .select('id, campaign_id')
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        const updatePatch: Record<string, unknown> = {};
        if (!existing.campaign_id) updatePatch.campaign_id = campaignId;
        if (dealValue !== null && !Number.isNaN(dealValue)) {
          updatePatch.deal_value = dealValue;
        }
        if (Object.keys(updatePatch).length > 0) {
          await db
            .from('contacts')
            .update(updatePatch)
            .eq('id', existing.id as string);
        }
        result.updated++;
      } else {
        const { error: insertErr } = await db.from('contacts').insert({
          phone,
          name,
          email: email ? String(email).trim() : null,
          company: company ? String(company).trim() : null,
          deal_value:
            dealValue !== null && !Number.isNaN(dealValue) ? dealValue : null,
          campaign_id: campaignId,
          pipeline_stage: 'Lead',
          channel: 'Import',
          source: 'Excel Import',
        });
        if (insertErr) {
          result.skipped++;
          result.errors.push(`Row ${rowNum}: ${insertErr.message}`);
        } else {
          result.imported++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.skipped++;
      result.errors.push(`Row ${rowNum}: ${msg}`);
    }
  }
  return result;
}

async function getOrCreateConversation(contactId: string): Promise<string> {
  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .or('status.eq.open,status.eq.assigned')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: created, error } = await db
    .from('conversations')
    .insert({
      contact_id: contactId,
      status: 'open',
      channel: 'WhatsApp',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !created) {
    throw new Error(`Failed to create conversation: ${error?.message ?? 'unknown'}`);
  }
  return created.id as string;
}

async function sendBulkMeta(
  to: string,
  dto: SendBulkMessageInput,
): Promise<string | null> {
  if (dto.type === 'text') {
    if (!dto.message) throw new Error('message required for type=text');
    return sendWhatsAppText(to, dto.message);
  }
  if (!dto.templateName) throw new Error('templateName required for type=template');
  return sendWhatsAppTemplate(
    to,
    dto.templateName,
    dto.templateLanguage ?? 'en',
    dto.templateComponents ?? [],
  );
}

async function runBulkJob(
  campaignId: string,
  dto: SendBulkMessageInput,
  job: BulkJobStatus,
): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: contacts, error } = await db
    .from('contacts')
    .select('id, phone, name')
    .eq('campaign_id', campaignId)
    .not('last_seen_at', 'is', null);
  if (error) {
    job.status = 'failed';
    job.errors.push(error.message);
    return;
  }
  const recipients = (contacts ?? []) as Array<{
    id: string;
    phone: string;
    name: string | null;
  }>;
  job.total = recipients.length;
  if (recipients.length === 0) {
    job.status = 'done';
    return;
  }
  for (const contact of recipients) {
    try {
      const conversationId = await getOrCreateConversation(contact.id);
      const waMessageId = await sendBulkMeta(contact.phone, dto);
      await db.from('messages').insert({
        conversation_id: conversationId,
        wa_message_id: waMessageId,
        direction: 'outbound',
        type: dto.type,
        content:
          dto.type === 'text' ? (dto.message ?? null) : dto.templateName ?? null,
        sent_by: null,
        status: 'sent',
      });
      await db
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
      job.sent++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      job.failed++;
      if (job.errors.length < 20) {
        job.errors.push(`${contact.phone}: ${msg}`);
      }
    }
  }
  job.status = 'done';
  console.log(
    `[BULK] Campaign ${campaignId} job ${job.jobId}: ${job.sent}/${job.total} sent, ${job.failed} failed`,
  );
}

export function sendBulkMessage(
  campaignId: string,
  dto: SendBulkMessageInput,
): { jobId: string; status: 'processing' } {
  const jobId = randomUUID();
  const job: BulkJobStatus = {
    jobId,
    status: 'processing',
    sent: 0,
    failed: 0,
    total: 0,
    errors: [],
  };
  bulkJobs.set(jobId, job);
  void runBulkJob(campaignId, dto, job).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    job.status = 'failed';
    job.errors.push(`Job failed: ${msg}`);
    console.error(`Bulk job ${jobId} failed: ${msg}`);
  });
  return { jobId, status: 'processing' };
}

export function getBulkJobStatus(jobId: string): BulkJobStatus {
  const job = bulkJobs.get(jobId);
  if (!job) throw new NotFoundError(`Job ${jobId} not found`);
  return job;
}

export function parseCampaignFilters(sp: URLSearchParams): CampaignFilters {
  const filters: CampaignFilters = {};
  if (sp.get('search')) filters.search = sp.get('search')!;
  if (sp.get('channel')) filters.channel = sp.get('channel')!;
  if (sp.get('source')) filters.source = sp.get('source')!;
  if (sp.get('date_from')) filters.date_from = sp.get('date_from')!;
  if (sp.get('date_to')) filters.date_to = sp.get('date_to')!;
  return filters;
}
