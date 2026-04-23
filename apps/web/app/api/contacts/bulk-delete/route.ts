import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { assertArray, parseJson } from '@/lib/server/validation';
import { BadRequestError } from '@/lib/server/errors';
import { bulkDeleteContacts } from '@/lib/server/services/contacts';
import { isUuid } from '@/lib/server/validation';

export async function POST(req: NextRequest) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const ids = assertArray<unknown>(body.ids, 'ids', {
      required: true,
      minLength: 1,
    })!;
    for (const id of ids) {
      if (!isUuid(id)) throw new BadRequestError('ids must be UUIDs');
    }
    return bulkDeleteContacts(ids as string[]);
  });
}
