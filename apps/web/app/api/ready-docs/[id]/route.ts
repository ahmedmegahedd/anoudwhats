import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertIn,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  deleteReadyDoc,
  findReadyDoc,
  updateReadyDoc,
  type UpdateReadyDocInput,
} from '@/lib/server/services/ready-docs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findReadyDoc(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateReadyDocInput = {};
    if (body.title !== undefined) dto.title = assertString(body.title, 'title')!;
    if (body.content !== undefined) dto.content = assertString(body.content, 'content')!;
    if (body.category !== undefined) dto.category = assertString(body.category, 'category');
    if (body.language !== undefined) {
      dto.language = assertIn(body.language, 'language', ['en', 'ar'] as const);
    }
    return updateReadyDoc(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteReadyDoc(params.id));
}
