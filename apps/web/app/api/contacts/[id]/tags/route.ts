import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { assertString, parseJson } from '@/lib/server/validation';
import { addContactTag } from '@/lib/server/services/contacts';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const tag = assertString(body.tag, 'tag', { required: true })!;
    return addContactTag(params.id, tag);
  });
}
