import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertNumber,
  assertString,
  assertUuid,
  parseJson,
} from '@/lib/server/validation';
import {
  updateDeal,
  type UpdateDealInput,
} from '@/lib/server/services/pipeline';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateDealInput = {};
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
    return updateDeal(params.id, dto);
  });
}
