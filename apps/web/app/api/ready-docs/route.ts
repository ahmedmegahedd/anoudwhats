import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertIn,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  createReadyDoc,
  findAllReadyDocs,
} from '@/lib/server/services/ready-docs';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    return findAllReadyDocs({
      category: sp.get('category') ?? undefined,
      language: sp.get('language') ?? undefined,
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
    return createReadyDoc({ title, content, category, language });
  });
}
