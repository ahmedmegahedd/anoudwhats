import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateDealDto } from './dto/update-deal.dto';
import type { Contact } from '@anoud-job/types';

export interface PipelineFilters {
  campaign_id?: string;
  assigned_agent_id?: string;
  channel?: string;
  source?: string;
}

export interface StageConfig {
  name: string;
  color: string;
  probability: number;
}

export const STAGES: StageConfig[] = [
  { name: 'Lead', color: '#6B7280', probability: 10 },
  { name: 'Qualified', color: '#3B82F6', probability: 30 },
  { name: 'Proposal', color: '#F59E0B', probability: 50 },
  { name: 'Negotiation', color: '#F97316', probability: 70 },
  { name: 'Won', color: '#22C55E', probability: 100 },
  { name: 'Lost', color: '#EF4444', probability: 0 },
];

export interface DealCard extends Contact {
  agent: { id: string; full_name: string; avatar_url: string | null } | null;
  last_message: { content: string | null; created_at: string } | null;
}

export interface StageStat {
  stage: string;
  count: number;
  totalValue: number;
}

export interface BoardResult {
  stages: Record<string, DealCard[]>;
  stats: StageStat[];
}

export interface ForecastStage {
  stage: string;
  count: number;
  totalValue: number;
  probability: number;
  weightedValue: number;
}

export interface ForecastResult {
  stages: ForecastStage[];
  totalPipeline: number;
  weightedForecast: number;
  wonThisMonth: number;
}

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ══════════════════════════════════════════════════════════════════════
  // ── Board ────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async getBoard(filters: PipelineFilters = {}): Promise<BoardResult> {
    const db = this.supabaseService.getClient();

    let query = db
      .from('contacts')
      .select(
        '*, agent:profiles!contacts_assigned_agent_id_fkey(id, full_name, avatar_url)',
      )
      .order('created_at', { ascending: false });

    if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
    if (filters.assigned_agent_id) {
      query = query.eq('assigned_agent_id', filters.assigned_agent_id);
    }
    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.source) query = query.eq('source', filters.source);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const contacts = (data ?? []) as unknown as DealCard[];

    // Fetch latest message per contact (via conversations)
    // Simpler approach: fetch latest message for each contact one-shot
    const contactIds = contacts.map((c) => c.id);
    const lastMessagesByContact = new Map<
      string,
      { content: string | null; created_at: string }
    >();

    if (contactIds.length > 0) {
      // Pull conversations for these contacts
      const { data: convs } = await db
        .from('conversations')
        .select('id, contact_id, last_message_at')
        .in('contact_id', contactIds)
        .order('last_message_at', { ascending: false });

      // For each contact, find the most recent conversation + its last message
      const seenContacts = new Set<string>();
      const latestConvIds: string[] = [];
      for (const c of convs ?? []) {
        const cid = c.contact_id as string;
        if (!seenContacts.has(cid)) {
          seenContacts.add(cid);
          latestConvIds.push(c.id as string);
        }
      }

      if (latestConvIds.length > 0) {
        // Fetch a sample of recent messages from those conversations
        const { data: msgs } = await db
          .from('messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', latestConvIds)
          .order('created_at', { ascending: false });

        // Build conv→contact map
        const convToContact = new Map<string, string>();
        for (const c of convs ?? []) {
          const cid = c.contact_id as string;
          const convId = c.id as string;
          if (!convToContact.has(convId)) convToContact.set(convId, cid);
        }

        for (const m of msgs ?? []) {
          const convId = m.conversation_id as string;
          const contactId = convToContact.get(convId);
          if (!contactId) continue;
          if (!lastMessagesByContact.has(contactId)) {
            lastMessagesByContact.set(contactId, {
              content: (m.content as string | null) ?? null,
              created_at: m.created_at as string,
            });
          }
        }
      }
    }

    // Group by stage
    const stages: Record<string, DealCard[]> = {};
    for (const stage of STAGES) stages[stage.name] = [];

    for (const contact of contacts) {
      const stageName = contact.pipeline_stage ?? 'Lead';
      if (!stages[stageName]) stages[stageName] = [];
      stages[stageName].push({
        ...contact,
        last_message: lastMessagesByContact.get(contact.id) ?? null,
      });
    }

    // Compute stats
    const stats: StageStat[] = STAGES.map((s) => {
      const list = stages[s.name] ?? [];
      const totalValue = list.reduce(
        (sum, c) => sum + (c.deal_value ?? 0),
        0,
      );
      return { stage: s.name, count: list.length, totalValue };
    });

    return { stages, stats };
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Forecast ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async getForecast(filters: PipelineFilters = {}): Promise<ForecastResult> {
    const board = await this.getBoard(filters);

    const stageResults: ForecastStage[] = STAGES.map((cfg) => {
      const list = board.stages[cfg.name] ?? [];
      const totalValue = list.reduce((sum, c) => sum + (c.deal_value ?? 0), 0);
      const weightedValue = (totalValue * cfg.probability) / 100;
      return {
        stage: cfg.name,
        count: list.length,
        totalValue,
        probability: cfg.probability,
        weightedValue,
      };
    });

    // Total pipeline excludes Lost
    const totalPipeline = stageResults
      .filter((s) => s.stage !== 'Lost')
      .reduce((sum, s) => sum + s.totalValue, 0);

    // Weighted forecast uses all open stages (Lost has probability 0 anyway)
    const weightedForecast = stageResults.reduce(
      (sum, s) => sum + s.weightedValue,
      0,
    );

    // Won This Month — contacts where stage=Won and created/updated this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const db = this.supabaseService.getClient();
    const { data: wonData, error: wonErr } = await db
      .from('contacts')
      .select('deal_value')
      .eq('pipeline_stage', 'Won')
      .gte('created_at', startOfMonth.toISOString());
    if (wonErr) {
      this.logger.warn(`Won this month query failed: ${wonErr.message}`);
    }
    const wonThisMonth = (wonData ?? []).reduce(
      (sum, row) => sum + ((row.deal_value as number | null) ?? 0),
      0,
    );

    return {
      stages: stageResults,
      totalPipeline,
      weightedForecast,
      wonThisMonth,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Mutations ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async moveStage(contactId: string, newStage: string): Promise<Contact> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('contacts')
      .update({ pipeline_stage: newStage })
      .eq('id', contactId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Contact ${contactId} not found`);
    return data as Contact;
  }

  async updateDeal(contactId: string, dto: UpdateDealDto): Promise<Contact> {
    const db = this.supabaseService.getClient();
    const patch: Record<string, unknown> = {};
    if (dto.pipeline_stage !== undefined) patch.pipeline_stage = dto.pipeline_stage;
    if (dto.deal_value !== undefined) patch.deal_value = dto.deal_value;
    if (dto.assigned_agent_id !== undefined) {
      patch.assigned_agent_id = dto.assigned_agent_id;
    }

    const { data, error } = await db
      .from('contacts')
      .update(patch)
      .eq('id', contactId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Contact ${contactId} not found`);
    return data as Contact;
  }

  getStages(): StageConfig[] {
    return STAGES;
  }
}
