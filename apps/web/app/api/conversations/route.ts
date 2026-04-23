import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { listConversations } from '@/lib/server/services/conversations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleAuthed(req, async () => {
    const sp = req.nextUrl.searchParams;
    const includeArchived = sp.get('includeArchived') === 'true';
    const limitRaw = sp.get('limit');
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return listConversations({
      includeArchived,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  });
}
