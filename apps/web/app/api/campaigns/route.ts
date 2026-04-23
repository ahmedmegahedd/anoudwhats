import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertNumber,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  createCampaign,
  findAllCampaigns,
  parseCampaignFilters,
} from '@/lib/server/services/campaigns';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    return findAllCampaigns(parseCampaignFilters(sp));
  });
}

export async function POST(req: NextRequest) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const name = assertString(body.name, 'name', { required: true })!;
    const channel = assertString(body.channel, 'channel');
    const source = assertString(body.source, 'source');
    const budget = assertNumber(body.budget, 'budget');
    const start_date = assertString(body.start_date, 'start_date');
    const end_date = assertString(body.end_date, 'end_date');
    return createCampaign({ name, channel, source, budget, start_date, end_date });
  });
}
