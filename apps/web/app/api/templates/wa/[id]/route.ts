import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  deleteWaTemplate,
  findWaTemplate,
} from '@/lib/server/services/templates';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findWaTemplate(params.id));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteWaTemplate(params.id));
}
