import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertArray,
  assertNumber,
  assertString,
  assertUuid,
  parseJson,
} from '@/lib/server/validation';
import {
  deleteContact,
  findContact,
  updateContact,
  type UpdateContactInput,
} from '@/lib/server/services/contacts';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findContact(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateContactInput = {};
    if (body.phone !== undefined) dto.phone = assertString(body.phone, 'phone')!;
    if (body.name !== undefined) dto.name = assertString(body.name, 'name');
    if (body.email !== undefined) dto.email = assertString(body.email, 'email');
    if (body.company !== undefined) dto.company = assertString(body.company, 'company');
    if (body.channel !== undefined) dto.channel = assertString(body.channel, 'channel');
    if (body.source !== undefined) dto.source = assertString(body.source, 'source');
    if (body.campaign_id !== undefined) {
      dto.campaign_id = assertUuid(body.campaign_id, 'campaign_id') as
        | string
        | undefined;
    }
    if (body.tags !== undefined) dto.tags = assertArray<string>(body.tags, 'tags');
    if (body.pipeline_stage !== undefined) {
      dto.pipeline_stage = assertString(body.pipeline_stage, 'pipeline_stage');
    }
    if (body.deal_value !== undefined) {
      dto.deal_value = assertNumber(body.deal_value, 'deal_value');
    }
    if (body.assigned_agent_id !== undefined) {
      dto.assigned_agent_id = assertUuid(
        body.assigned_agent_id,
        'assigned_agent_id',
      ) as string | undefined;
    }
    return updateContact(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteContact(params.id));
}
