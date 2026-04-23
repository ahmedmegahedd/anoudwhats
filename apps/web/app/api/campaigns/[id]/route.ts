import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertNumber,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  deleteCampaign,
  findCampaign,
  updateCampaign,
  type UpdateCampaignInput,
} from '@/lib/server/services/campaigns';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findCampaign(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateCampaignInput = {};
    if (body.name !== undefined) dto.name = assertString(body.name, 'name')!;
    if (body.channel !== undefined) dto.channel = assertString(body.channel, 'channel');
    if (body.source !== undefined) dto.source = assertString(body.source, 'source');
    if (body.budget !== undefined) dto.budget = assertNumber(body.budget, 'budget');
    if (body.start_date !== undefined) {
      dto.start_date = assertString(body.start_date, 'start_date');
    }
    if (body.end_date !== undefined) {
      dto.end_date = assertString(body.end_date, 'end_date');
    }
    return updateCampaign(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteCampaign(params.id));
}
