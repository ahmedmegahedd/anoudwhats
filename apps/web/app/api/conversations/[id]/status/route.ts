import type { NextRequest } from 'next/server';
import type { ConversationStatus } from '@anoud-job/types';
import { handleAuthed } from '@/lib/server/handler';
import { parseJson, assertIn } from '@/lib/server/validation';
import { updateConversationStatus } from '@/lib/server/services/conversations';

const STATUSES = ['open', 'resolved', 'archived'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const status = assertIn(body.status, 'status', STATUSES, { required: true })!;
    return updateConversationStatus(params.id, status as ConversationStatus);
  });
}
