import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getContactChannels } from '@/lib/server/services/contacts';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => getContactChannels());
}
