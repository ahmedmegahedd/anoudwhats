import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { assertArray, isUuid, parseJson } from '@/lib/server/validation';
import { BadRequestError } from '@/lib/server/errors';
import { bulkDownloadAttachmentUrls } from '@/lib/server/services/attachments';

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
    return bulkDownloadAttachmentUrls(ids as string[]);
  });
}
