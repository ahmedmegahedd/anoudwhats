import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { parseJson, assertIn } from '@/lib/server/validation';
import { updateAgentAvailability } from '@/lib/server/services/agents';

const AVAILABILITIES = ['online', 'away', 'offline'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const availability = assertIn(body.availability, 'availability', AVAILABILITIES, {
      required: true,
    })!;
    return updateAgentAvailability(params.id, availability);
  });
}
