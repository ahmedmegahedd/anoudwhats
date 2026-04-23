import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { parseJson, assertString } from '@/lib/server/validation';
import {
  deleteTeam,
  findTeam,
  updateTeam,
  type UpdateTeamInput,
} from '@/lib/server/services/teams';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findTeam(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateTeamInput = {};
    if (body.name !== undefined) {
      dto.name = assertString(body.name, 'name', { min: 1, max: 100 })!;
    }
    if (body.description !== undefined) {
      dto.description = assertString(body.description, 'description');
    }
    if (body.color !== undefined) {
      dto.color = assertString(body.color, 'color');
    }
    return updateTeam(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    await deleteTeam(params.id);
    return undefined;
  });
}
