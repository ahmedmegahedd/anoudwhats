import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { isOutsideBusinessHours } from '@/lib/server/services/settings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleAuthed(req, async () => {
    const outside = await isOutsideBusinessHours();
    return { outsideBusinessHours: outside };
  });
}
