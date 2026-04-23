import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { getBulkJobStatus } from '@/lib/server/services/campaigns';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  return handleAuthed(req, () => getBulkJobStatus(params.jobId));
}
