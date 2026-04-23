import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { assertBoolean, parseJson } from '@/lib/server/validation';
import { toggleRule } from '@/lib/server/services/automation';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const isActive = assertBoolean(body.isActive, 'isActive', {
      required: true,
    })!;
    return toggleRule(params.id, isActive);
  });
}
