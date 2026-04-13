import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateReadyDocDto } from './dto/create-ready-doc.dto';
import { UpdateReadyDocDto } from './dto/update-ready-doc.dto';
import type { ReadyDoc } from '@anoud-job/types';

interface ReadyDocFilters {
  category?: string;
  language?: string;
}

const SEED_DOCS: Omit<ReadyDoc, 'id' | 'created_at' | 'created_by'>[] = [
  {
    title: 'Welcome Message',
    category: 'Greeting',
    language: 'en',
    content: 'Hello! 👋 Welcome to Anoud Job. How can we help you today?',
  },
  {
    title: 'Pricing Inquiry Response',
    category: 'Pricing',
    language: 'en',
    content:
      "Thank you for your interest! Our team will send you our latest pricing details shortly. Is there a specific service you'd like to know about?",
  },
  {
    title: 'Follow Up',
    category: 'After-sales',
    language: 'en',
    content:
      "Hi! We wanted to follow up on your recent inquiry. Have you had a chance to review our proposal? We're here if you have any questions. 😊",
  },
  {
    title: 'Out of Office',
    category: 'Support',
    language: 'en',
    content:
      "Thank you for reaching out! Our team is currently unavailable. Our working hours are Sunday–Thursday, 9AM–6PM. We'll get back to you first thing next business day. 🙏",
  },
  {
    title: 'Thank You',
    category: 'After-sales',
    language: 'en',
    content:
      "Thank you so much for choosing us! It was a pleasure working with you. Don't hesitate to reach out if you need anything else. ⭐",
  },
];

@Injectable()
export class ReadyDocsService {
  private readonly logger = new Logger(ReadyDocsService.name);
  private seedChecked = false;

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(filters?: ReadyDocFilters): Promise<ReadyDoc[]> {
    await this.ensureSeeded();

    const db = this.supabaseService.getClient();
    let query = db
      .from('ready_docs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.language) query = query.eq('language', filters.language);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ReadyDoc[];
  }

  async findOne(id: string): Promise<ReadyDoc> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('ready_docs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Ready doc ${id} not found`);
    return data as ReadyDoc;
  }

  async create(dto: CreateReadyDocDto): Promise<ReadyDoc> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('ready_docs')
      .insert({
        title: dto.title,
        content: dto.content,
        category: dto.category ?? null,
        language: dto.language ?? 'en',
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as ReadyDoc;
  }

  async update(id: string, dto: UpdateReadyDocDto): Promise<ReadyDoc> {
    const db = this.supabaseService.getClient();
    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.language !== undefined) patch.language = dto.language;

    const { data, error } = await db
      .from('ready_docs')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Ready doc ${id} not found`);
    return data as ReadyDoc;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const db = this.supabaseService.getClient();
    const { error } = await db.from('ready_docs').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async getCategories(): Promise<string[]> {
    await this.ensureSeeded();
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('ready_docs')
      .select('category')
      .not('category', 'is', null);
    if (error) throw new BadRequestException(error.message);

    const unique = new Set<string>();
    for (const row of data ?? []) {
      const cat = (row as { category: string | null }).category;
      if (cat) unique.add(cat);
    }
    return Array.from(unique).sort();
  }

  // ── One-time seed ─────────────────────────────────────────────────────

  private async ensureSeeded(): Promise<void> {
    if (this.seedChecked) return;
    this.seedChecked = true;

    try {
      const db = this.supabaseService.getClient();
      const { count, error } = await db
        .from('ready_docs')
        .select('id', { count: 'exact', head: true });
      if (error) {
        this.logger.warn(`Seed check failed: ${error.message}`);
        return;
      }
      if ((count ?? 0) > 0) return;

      const { error: insertErr } = await db.from('ready_docs').insert(SEED_DOCS);
      if (insertErr) {
        this.logger.warn(`Seed insert failed: ${insertErr.message}`);
      } else {
        this.logger.log(`[READY-DOCS] Seeded ${SEED_DOCS.length} example docs`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Seed wrapper failed: ${msg}`);
    }
  }
}
