import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { removeContactTag } from '@/lib/server/services/contacts';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; tag: string } },
) {
  return handleAuthed(req, () =>
    removeContactTag(params.id, decodeURIComponent(params.tag)),
  );
}
