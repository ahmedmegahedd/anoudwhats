import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { parseJson, assertUuid } from '@/lib/server/validation';
import { assignConversation } from '@/lib/server/services/conversations';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const agentId = assertUuid(body.agentId, 'agentId', { nullable: true });
    const teamId = assertUuid(body.teamId, 'teamId', { nullable: true });
    return assignConversation(params.id, agentId, teamId);
  });
}
