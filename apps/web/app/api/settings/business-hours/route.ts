import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { parseJson } from '@/lib/server/validation';
import {
  getBusinessHours,
  setBusinessHours,
  type BusinessHours,
} from '@/lib/server/services/settings';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => getBusinessHours());
}

export async function POST(req: NextRequest) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    return setBusinessHours(body as unknown as BusinessHours);
  });
}
