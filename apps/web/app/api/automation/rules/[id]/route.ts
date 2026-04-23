import type { NextRequest } from 'next/server';
import type { AutomationTriggerType } from '@anoud-job/types';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertArray,
  assertBoolean,
  assertIn,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  deleteRule,
  findRule,
  updateRule,
  type UpdateRuleInput,
} from '@/lib/server/services/automation';

const TRIGGERS = [
  'message_received',
  'conversation_opened',
  'conversation_resolved',
  'keyword_match',
  'no_reply_timeout',
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findRule(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateRuleInput = {};
    if (body.name !== undefined) dto.name = assertString(body.name, 'name')!;
    if (body.trigger_type !== undefined) {
      dto.trigger_type = assertIn(
        body.trigger_type,
        'trigger_type',
        TRIGGERS,
      )! as AutomationTriggerType;
    }
    if (body.trigger_config !== undefined) {
      dto.trigger_config =
        body.trigger_config && typeof body.trigger_config === 'object'
          ? (body.trigger_config as Record<string, unknown>)
          : undefined;
    }
    if (body.conditions !== undefined) {
      dto.conditions = assertArray<Record<string, unknown>>(
        body.conditions,
        'conditions',
      );
    }
    if (body.actions !== undefined) {
      dto.actions = assertArray<Record<string, unknown>>(
        body.actions,
        'actions',
      );
    }
    if (body.is_active !== undefined) {
      dto.is_active = assertBoolean(body.is_active, 'is_active');
    }
    return updateRule(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteRule(params.id));
}
