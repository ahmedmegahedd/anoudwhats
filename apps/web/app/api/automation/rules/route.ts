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
  createRule,
  findAllRules,
} from '@/lib/server/services/automation';

const TRIGGERS = [
  'message_received',
  'conversation_opened',
  'conversation_resolved',
  'keyword_match',
  'no_reply_timeout',
] as const;

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => findAllRules());
}

export async function POST(req: NextRequest) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const name = assertString(body.name, 'name', { required: true })!;
    const trigger_type = assertIn(body.trigger_type, 'trigger_type', TRIGGERS, {
      required: true,
    })! as AutomationTriggerType;
    const trigger_config =
      body.trigger_config && typeof body.trigger_config === 'object'
        ? (body.trigger_config as Record<string, unknown>)
        : undefined;
    const conditions = assertArray<Record<string, unknown>>(
      body.conditions,
      'conditions',
    );
    const actions = assertArray<Record<string, unknown>>(body.actions, 'actions');
    const is_active = assertBoolean(body.is_active, 'is_active');
    return createRule({
      name,
      trigger_type,
      trigger_config,
      conditions,
      actions,
      is_active,
    });
  });
}
