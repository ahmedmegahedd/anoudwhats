import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SendBulkMessageDto } from './dto/send-bulk-message.dto';
import type { Campaign } from '@anoud-job/types';

export interface CampaignFilters {
  search?: string;
  channel?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
}

export interface CampaignWithStats extends Campaign {
  lead_count: number;
  won_count: number;
  total_value: number;
  created_by_name: string | null;
}

export interface CampaignAnalytics {
  totalLeads: number;
  byStage: { stage: string; count: number }[];
  conversionRate: number;
  totalValue: number;
  wonValue: number;
}

export interface CampaignLead {
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
}

export interface CampaignDetail extends Campaign {
  analytics: CampaignAnalytics;
  leads: CampaignLead[];
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
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

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly bulkJobs = new Map<string, BulkJobStatus>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════
  // ── CRUD ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async findAll(filters: CampaignFilters = {}): Promise<CampaignWithStats[]> {
    const db = this.supabaseService.getClient();
    let query = db
      .from('campaigns')
      .select('*, creator:profiles!campaigns_created_by_fkey(full_name)')
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
    if (error) throw new BadRequestException(error.message);

    const rows = (data ?? []) as Array<
      Campaign & { creator: { full_name: string } | null }
    >;

    // Batch fetch contacts to compute per-campaign stats
    const ids = rows.map((r) => r.id);
    const statsMap = new Map<
      string,
      { lead_count: number; won_count: number; total_value: number }
    >();

    if (ids.length > 0) {
      const { data: contacts } = await db
        .from('contacts')
        .select('campaign_id, pipeline_stage, deal_value')
        .in('campaign_id', ids);

      for (const row of rows) {
        statsMap.set(row.id, { lead_count: 0, won_count: 0, total_value: 0 });
      }

      for (const c of contacts ?? []) {
        const id = c.campaign_id as string;
        const stats = statsMap.get(id);
        if (!stats) continue;
        stats.lead_count++;
        if ((c.pipeline_stage as string) === 'Won') stats.won_count++;
        stats.total_value += (c.deal_value as number | null) ?? 0;
      }
    }

    return rows.map((row) => {
      const stats = statsMap.get(row.id) ?? {
        lead_count: 0,
        won_count: 0,
        total_value: 0,
      };
      const { creator, ...rest } = row;
      return {
        ...(rest as Campaign),
        ...stats,
        created_by_name: creator?.full_name ?? null,
      };
    });
  }

  async findOne(id: string): Promise<CampaignDetail> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Campaign ${id} not found`);

    // Fetch leads (up to 500 per detail view)
    const { data: leadsData } = await db
      .from('contacts')
      .select(
        'id, name, phone, email, company, pipeline_stage, deal_value, assigned_agent_id, channel, source, last_seen_at',
      )
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(500);

    const leads = (leadsData ?? []) as CampaignLead[];

    // Analytics
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

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    const db = this.supabaseService.getClient();
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
    if (error) throw new BadRequestException(error.message);
    return data as Campaign;
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const db = this.supabaseService.getClient();
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
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Campaign ${id} not found`);
    return data as Campaign;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const db = this.supabaseService.getClient();
    // Detach contacts
    await db
      .from('contacts')
      .update({ campaign_id: null })
      .eq('campaign_id', id);
    const { error } = await db.from('campaigns').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Import Leads ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async importLeads(
    campaignId: string,
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    // Verify campaign exists
    const db = this.supabaseService.getClient();
    const { data: campaign } = await db
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .maybeSingle();
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);

    // Parse workbook
    let rows: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('Empty workbook');
      rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Failed to parse file: ${msg}`);
    }

    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 accounts for header row + 1-index

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

        const phone = this.normalizePhone(rawPhone);
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

        // Check existing
        const { data: existing } = await db
          .from('contacts')
          .select('id, campaign_id')
          .eq('phone', phone)
          .maybeSingle();

        if (existing) {
          // Update campaign_id if not already set, and update deal_value if provided
          const updatePatch: Record<string, unknown> = {};
          if (!existing.campaign_id) updatePatch.campaign_id = campaignId;
          if (dealValue !== null && !Number.isNaN(dealValue)) {
            updatePatch.deal_value = dealValue;
          }
          if (Object.keys(updatePatch).length > 0) {
            await db.from('contacts').update(updatePatch).eq('id', existing.id as string);
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

  // ══════════════════════════════════════════════════════════════════════
  // ── Bulk Message ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  sendBulkMessage(
    campaignId: string,
    dto: SendBulkMessageDto,
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
    this.bulkJobs.set(jobId, job);

    // Fire-and-forget background processing
    void this.runBulkJob(campaignId, dto, job).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      job.status = 'failed';
      job.errors.push(`Job failed: ${msg}`);
      this.logger.error(`Bulk job ${jobId} failed: ${msg}`);
    });

    return { jobId, status: 'processing' };
  }

  getBulkJobStatus(jobId: string): BulkJobStatus {
    const job = this.bulkJobs.get(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }

  private async runBulkJob(
    campaignId: string,
    dto: SendBulkMessageDto,
    job: BulkJobStatus,
  ): Promise<void> {
    const db = this.supabaseService.getClient();

    // Fetch contacts with prior WhatsApp interaction
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
        // Resolve or create conversation
        const conversationId = await this.getOrCreateConversation(contact.id);

        // Send message via Meta API
        const waMessageId = await this.sendWhatsAppMessage(contact.phone, dto);

        // Save outbound message
        await db.from('messages').insert({
          conversation_id: conversationId,
          wa_message_id: waMessageId,
          direction: 'outbound',
          type: dto.type,
          content: dto.type === 'text' ? (dto.message ?? null) : dto.templateName ?? null,
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
    this.logger.log(
      `[BULK] Campaign ${campaignId} job ${job.jobId}: ${job.sent}/${job.total} sent, ${job.failed} failed`,
    );
  }

  private async getOrCreateConversation(contactId: string): Promise<string> {
    const db = this.supabaseService.getClient();

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

  private async sendWhatsAppMessage(
    to: string,
    dto: SendBulkMessageDto,
  ): Promise<string | null> {
    const phoneNumberId = this.config.getOrThrow<string>('META_PHONE_NUMBER_ID');
    const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    let body: Record<string, unknown>;
    if (dto.type === 'text') {
      if (!dto.message) throw new Error('message required for type=text');
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: dto.message },
      };
    } else {
      if (!dto.templateName) throw new Error('templateName required for type=template');
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: dto.templateName,
          language: { code: dto.templateLanguage ?? 'en' },
          components: dto.templateComponents ?? [],
        },
      };
    }

    const { data } = await firstValueFrom(
      this.httpService.post(url, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return (data as { messages?: { id: string }[] })?.messages?.[0]?.id ?? null;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Helpers ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  private normalizePhone(raw: string): string | null {
    // Strip all non-digit/+  characters
    let phone = raw.replace(/[^\d+]/g, '');
    if (!phone) return null;

    // Egyptian convenience: 01XXXXXXXXX (11 digits) → 201XXXXXXXXX
    if (phone.startsWith('0') && phone.length === 11) {
      phone = `20${phone.slice(1)}`;
    }

    // Must have at least 8 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8) return null;

    return phone;
  }
}
