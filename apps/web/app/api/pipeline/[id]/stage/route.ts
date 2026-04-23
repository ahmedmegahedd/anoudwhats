import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { assertString, parseJson } from '@/lib/server/validation';
import { moveDealStage } from '@/lib/server/services/pipeline';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const newStage = assertString(body.newStage, 'newStage', {
      required: true,
    })!;
    return moveDealStage(params.id, newStage);
  });
}
