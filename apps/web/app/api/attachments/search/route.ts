import type { NextRequest } from 'next/server';
import type { AttachmentFileType } from '@anoud-job/types';
import { handleAuthed } from '@/lib/server/handler';
import { searchAttachments } from '@/lib/server/services/attachments';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    const q = sp.get('q') ?? '';
    const fileType = (sp.get('file_type') as AttachmentFileType | null) ?? undefined;
    return searchAttachments(q, { file_type: fileType });
  });
}
