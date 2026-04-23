import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getAgentStats } from '@/lib/server/services/agents';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => getAgentStats(params.id));
}
