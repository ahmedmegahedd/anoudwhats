import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { testMetaConnection } from '@/lib/server/services/settings';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => testMetaConnection());
}
