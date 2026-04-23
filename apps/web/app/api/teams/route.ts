import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleAuthed, handleAuthedRaw } from '@/lib/server/handler';
import { parseJson, assertString } from '@/lib/server/validation';
import { createTeam, findAllTeams } from '@/lib/server/services/teams';
import { HttpError } from '@/lib/server/errors';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => findAllTeams());
}

export async function POST(req: NextRequest) {
  return handleAuthedRaw(req, async () => {
    const body = await parseJson(req);
    const name = assertString(body.name, 'name', {
      required: true,
      min: 1,
      max: 100,
    })!;
    const description = assertString(body.description, 'description');
    const color = assertString(body.color, 'color');
    try {
      const result = await createTeam({ name, description, color });
      return NextResponse.json(result, { status: 201 });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json(
          { message: err.message },
          { status: err.status },
        );
      }
      throw err;
    }
  });
}
