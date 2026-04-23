import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { parseJson, assertUuid } from '@/lib/server/validation';
import { addTeamMember } from '@/lib/server/services/teams';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const agentId = assertUuid(body.agentId, 'agentId', { required: true })!;
    return addTeamMember(params.id, agentId as string);
  });
}
