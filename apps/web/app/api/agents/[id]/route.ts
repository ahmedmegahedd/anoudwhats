import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  parseJson,
  assertIn,
  assertNumber,
  assertString,
  assertUuid,
  isUuid,
} from '@/lib/server/validation';
import { BadRequestError } from '@/lib/server/errors';
import {
  findAgent,
  updateAgent,
  deleteAgent,
  type UpdateAgentInput,
} from '@/lib/server/services/agents';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findAgent(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateAgentInput = {};
    if (body.full_name !== undefined) {
      dto.full_name = assertString(body.full_name, 'full_name')!;
    }
    if (body.role !== undefined) {
      dto.role = assertIn(body.role, 'role', ['admin', 'agent'] as const)!;
    }
    if (body.team_id !== undefined) {
      if (body.team_id === null) {
        dto.team_id = null;
      } else if (!isUuid(body.team_id)) {
        throw new BadRequestError('team_id must be a valid UUID or null');
      } else {
        dto.team_id = body.team_id as string;
      }
    }
    if (body.max_chats !== undefined) {
      dto.max_chats = assertNumber(body.max_chats, 'max_chats', {
        int: true,
        min: 1,
        max: 50,
      });
    }
    if (body.availability !== undefined) {
      dto.availability = assertIn(
        body.availability,
        'availability',
        ['online', 'away', 'offline'] as const,
      )!;
    }
    return updateAgent(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    await deleteAgent(params.id);
    return undefined;
  });
}
