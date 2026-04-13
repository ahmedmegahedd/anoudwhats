import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateInternalTemplateDto } from './dto/create-internal-template.dto';
import { UpdateInternalTemplateDto } from './dto/update-internal-template.dto';
import type { WaTemplate, InternalTemplate } from '@anoud-job/types';

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

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ── WA Templates (synced from Meta) ────────────────────────────────────

  async syncFromMeta(): Promise<{ synced: number; total: number }> {
    const wabaId = this.config.get<string>('META_WABA_ID');
    const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');

    if (!wabaId) {
      throw new BadRequestException(
        'META_WABA_ID is not configured. Add it to apps/api/.env',
      );
    }

    const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;

    let metaTemplates: MetaTemplate[] = [];
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{ data: MetaTemplate[] }>(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { limit: 100 },
        }),
      );
      metaTemplates = data?.data ?? [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Meta template sync failed: ${msg}`);
      throw new BadRequestException(`Meta API error: ${msg}`);
    }

    const total = metaTemplates.length;
    if (total === 0) {
      return { synced: 0, total: 0 };
    }

    const db = this.supabaseService.getClient();
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
      throw new BadRequestException(`Failed to upsert templates: ${error.message}`);
    }

    this.logger.log(`[TEMPLATES] Synced ${total} templates from Meta`);
    return { synced: total, total };
  }

  @Cron('0 0 * * *')
  async scheduledSync(): Promise<void> {
    try {
      const result = await this.syncFromMeta();
      this.logger.log(
        `[CRON] Daily template sync: ${result.synced}/${result.total}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[CRON] Daily template sync failed: ${msg}`);
    }
  }

  async findAllWa(filters?: WaTemplateFilters): Promise<WaTemplate[]> {
    const db = this.supabaseService.getClient();
    let query = db.from('wa_templates').select('*').order('name', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.language) query = query.eq('language', filters.language);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as WaTemplate[];
  }

  async findOneWa(id: string): Promise<WaTemplate> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('wa_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`WA template ${id} not found`);
    return data as WaTemplate;
  }

  async deleteWa(id: string): Promise<{ success: boolean }> {
    const db = this.supabaseService.getClient();
    const { error } = await db.from('wa_templates').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── Internal Templates ─────────────────────────────────────────────────

  async findAllInternal(filters?: InternalTemplateFilters): Promise<InternalTemplate[]> {
    const db = this.supabaseService.getClient();
    let query = db
      .from('internal_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.language) query = query.eq('language', filters.language);
    if (typeof filters?.is_auto === 'boolean') query = query.eq('is_auto', filters.is_auto);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as InternalTemplate[];
  }

  async findOneInternal(id: string): Promise<InternalTemplate> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('internal_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Internal template ${id} not found`);
    return data as InternalTemplate;
  }

  async createInternal(dto: CreateInternalTemplateDto): Promise<InternalTemplate> {
    const db = this.supabaseService.getClient();
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

    if (error) throw new BadRequestException(error.message);
    return data as InternalTemplate;
  }

  async updateInternal(
    id: string,
    dto: UpdateInternalTemplateDto,
  ): Promise<InternalTemplate> {
    const db = this.supabaseService.getClient();
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

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Internal template ${id} not found`);
    return data as InternalTemplate;
  }

  async deleteInternal(id: string): Promise<{ success: boolean }> {
    const db = this.supabaseService.getClient();
    const { error } = await db.from('internal_templates').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
