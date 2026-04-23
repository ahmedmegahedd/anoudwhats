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
  createContact,
  findAllContacts,
  parseContactFilters,
} from '@/lib/server/services/contacts';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const url = new URL(req.url);
    return findAllContacts(parseContactFilters(url.searchParams));
  });
}

export async function POST(req: NextRequest) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const phone = assertString(body.phone, 'phone', { required: true })!;
    const name = assertString(body.name, 'name');
    const email = assertString(body.email, 'email');
    const company = assertString(body.company, 'company');
    const channel = assertString(body.channel, 'channel');
    const source = assertString(body.source, 'source');
    const campaign_id = assertUuid(body.campaign_id, 'campaign_id') as
      | string
      | undefined;
    const tags = assertArray<string>(body.tags, 'tags');
    const pipeline_stage = assertString(body.pipeline_stage, 'pipeline_stage');
    const deal_value = assertNumber(body.deal_value, 'deal_value');
    const assigned_agent_id = assertUuid(
      body.assigned_agent_id,
      'assigned_agent_id',
    ) as string | undefined;
    return createContact({
      phone,
      name,
      email,
      company,
      channel,
      source,
      campaign_id,
      tags,
      pipeline_stage,
      deal_value,
      assigned_agent_id,
    });
  });
}
