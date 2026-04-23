import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  getPipelineForecast,
  parsePipelineFilters,
} from '@/lib/server/services/pipeline';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    return getPipelineForecast(parsePipelineFilters(sp));
  });
}
