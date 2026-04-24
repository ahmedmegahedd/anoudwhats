import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { listMessages } from '@/lib/server/services/conversations';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    return listMessages(params.id);
  });
}
