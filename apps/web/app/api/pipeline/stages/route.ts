import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getPipelineStages } from '@/lib/server/services/pipeline';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => getPipelineStages());
}
