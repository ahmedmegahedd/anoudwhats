import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getReadyDocCategories } from '@/lib/server/services/ready-docs';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => getReadyDocCategories());
}
