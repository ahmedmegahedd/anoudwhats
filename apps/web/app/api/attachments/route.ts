import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  findAllAttachments,
  parseAttachmentFilters,
} from '@/lib/server/services/attachments';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    return findAllAttachments(parseAttachmentFilters(sp));
  });
}
