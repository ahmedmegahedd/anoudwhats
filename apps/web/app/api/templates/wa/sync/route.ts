import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { syncTemplatesFromMeta } from '@/lib/server/services/templates';

export async function POST(req: NextRequest) {
  return handleAuthed(req, () => syncTemplatesFromMeta());
}
