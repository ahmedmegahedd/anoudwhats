import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getAttachmentDownloadUrl } from '@/lib/server/services/attachments';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => getAttachmentDownloadUrl(params.id));
}
