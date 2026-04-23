import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import {
  assertArray,
  assertIn,
  assertString,
  parseJson,
} from '@/lib/server/validation';
import { BadRequestError } from '@/lib/server/errors';
import {
  sendBulkMessage,
  type SendBulkMessageInput,
} from '@/lib/server/services/campaigns';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const body = await parseJson(req);
    const type = assertIn(body.type, 'type', ['text', 'template'] as const, {
      required: true,
    })!;
    const dto: SendBulkMessageInput = { type };
    if (type === 'text') {
      dto.message = assertString(body.message, 'message', { required: true })!;
    } else {
      dto.templateName = assertString(body.templateName, 'templateName', {
        required: true,
      })!;
      dto.templateLanguage = assertString(body.templateLanguage, 'templateLanguage');
      dto.templateComponents = assertArray<unknown>(
        body.templateComponents,
        'templateComponents',
      );
    }
    if (!dto.message && !dto.templateName) {
      throw new BadRequestError('message or templateName required');
    }
    return sendBulkMessage(params.id, dto);
  });
}
