import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { findAllWaTemplates } from '@/lib/server/services/templates';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    return findAllWaTemplates({
      status: sp.get('status') ?? undefined,
      category: sp.get('category') ?? undefined,
      language: sp.get('language') ?? undefined,
    });
  });
}
