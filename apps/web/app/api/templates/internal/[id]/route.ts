import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertBoolean,
  assertIn,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import {
  deleteInternalTemplate,
  findInternalTemplate,
  updateInternalTemplate,
  type UpdateInternalTemplateInput,
} from '@/lib/server/services/templates';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => findInternalTemplate(params.id));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const dto: UpdateInternalTemplateInput = {};
    if (body.title !== undefined) dto.title = assertString(body.title, 'title')!;
    if (body.content !== undefined) dto.content = assertString(body.content, 'content')!;
    if (body.category !== undefined) dto.category = assertString(body.category, 'category');
    if (body.language !== undefined) {
      dto.language = assertIn(body.language, 'language', ['en', 'ar'] as const);
    }
    if (body.is_auto !== undefined) dto.is_auto = assertBoolean(body.is_auto, 'is_auto');
    if (body.trigger_rule !== undefined) {
      dto.trigger_rule =
        body.trigger_rule &&
        typeof body.trigger_rule === 'object' &&
        !Array.isArray(body.trigger_rule)
          ? (body.trigger_rule as Record<string, unknown>)
          : undefined;
    }
    return updateInternalTemplate(params.id, dto);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, () => deleteInternalTemplate(params.id));
}
