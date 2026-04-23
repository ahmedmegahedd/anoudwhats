import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { removeTeamMember } from '@/lib/server/services/teams';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; agentId: string } },
) {
  return handleAuthed(req, () => removeTeamMember(params.id, params.agentId));
}
