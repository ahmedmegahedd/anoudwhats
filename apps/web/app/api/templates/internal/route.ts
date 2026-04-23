import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertBoolean,
  assertIn,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  createInternalTemplate,
  findAllInternalTemplates,
} from '@/lib/server/services/templates';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    const isAuto = sp.get('is_auto');
    return findAllInternalTemplates({
      category: sp.get('category') ?? undefined,
      language: sp.get('language') ?? undefined,
      is_auto:
        isAuto === 'true' ? true : isAuto === 'false' ? false : undefined,
    });
  });
}

export async function POST(req: NextRequest) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const title = assertString(body.title, 'title', { required: true })!;
    const content = assertString(body.content, 'content', { required: true })!;
    const category = assertString(body.category, 'category');
    const language = assertIn(body.language, 'language', ['en', 'ar'] as const);
    const is_auto = assertBoolean(body.is_auto, 'is_auto');
    const trigger_rule =
      body.trigger_rule &&
      typeof body.trigger_rule === 'object' &&
      !Array.isArray(body.trigger_rule)
        ? (body.trigger_rule as Record<string, unknown>)
        : undefined;
    return createInternalTemplate({
      title,
      content,
      category,
      language,
      is_auto,
      trigger_rule,
    });
  });
}
