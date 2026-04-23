import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  deleteAttachment,
  findAttachment,
} from '@/lib/server/services/attachments';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findAttachment(params.id));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteAttachment(params.id));
}
