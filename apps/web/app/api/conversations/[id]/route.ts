import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getConversation } from '@/lib/server/services/conversations';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    return getConversation(params.id);
  });
}
