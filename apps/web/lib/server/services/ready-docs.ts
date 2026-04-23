import type { ReadyDoc } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { BadRequestError, NotFoundError } from '../errors';

interface ReadyDocFilters {
  category?: string;
  language?: string;
}

export interface CreateReadyDocInput {
  title: string;
  content: string;
  category?: string;
  language?: 'en' | 'ar';
}

export type UpdateReadyDocInput = Partial<CreateReadyDocInput>;

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

let seedChecked = false;

async function ensureSeeded(): Promise<void> {
  if (seedChecked) return;
  seedChecked = true;
  try {
    const db = getSupabaseAdmin();
    const { count, error } = await db
      .from('ready_docs')
      .select('id', { count: 'exact', head: true });
    if (error) {
      console.warn(`[ready-docs] seed check failed: ${error.message}`);
      return;
    }
    if ((count ?? 0) > 0) return;
    const { error: insertErr } = await db.from('ready_docs').insert(SEED_DOCS);
    if (insertErr) {
      console.warn(`[ready-docs] seed insert failed: ${insertErr.message}`);
    } else {
      console.log(`[ready-docs] seeded ${SEED_DOCS.length} example docs`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ready-docs] seed wrapper failed: ${msg}`);
  }
}

export async function findAllReadyDocs(
  filters?: ReadyDocFilters,
): Promise<ReadyDoc[]> {
  await ensureSeeded();
  const db = getSupabaseAdmin();
  let query = db
    .from('ready_docs')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.language) query = query.eq('language', filters.language);
  const { data, error } = await query;
  if (error) throw new BadRequestError(error.message);
  return (data ?? []) as ReadyDoc[];
}

export async function findReadyDoc(id: string): Promise<ReadyDoc> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('ready_docs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Ready doc ${id} not found`);
  return data as ReadyDoc;
}

export async function createReadyDoc(
  dto: CreateReadyDocInput,
): Promise<ReadyDoc> {
  const db = getSupabaseAdmin();
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
  if (error) throw new BadRequestError(error.message);
  return data as ReadyDoc;
}

export async function updateReadyDoc(
  id: string,
  dto: UpdateReadyDocInput,
): Promise<ReadyDoc> {
  const db = getSupabaseAdmin();
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
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Ready doc ${id} not found`);
  return data as ReadyDoc;
}

export async function deleteReadyDoc(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('ready_docs').delete().eq('id', id);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}

export async function getReadyDocCategories(): Promise<string[]> {
  await ensureSeeded();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('ready_docs')
    .select('category')
    .not('category', 'is', null);
  if (error) throw new BadRequestError(error.message);
  const unique = new Set<string>();
  for (const row of data ?? []) {
    const cat = (row as { category: string | null }).category;
    if (cat) unique.add(cat);
  }
  return Array.from(unique).sort();
}
