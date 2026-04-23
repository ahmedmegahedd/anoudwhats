import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleAuthedRaw } from '@/lib/server/handler';
import {
  parseJson,
  assertIn,
  assertUuid,
  assertString,
  assertArray,
} from '@/lib/server/validation';
import { sendMessage } from '@/lib/server/services/messages';
import { HttpError } from '@/lib/server/errors';

export async function POST(req: NextRequest) {
  return handleAuthedRaw(req, async () => {
    const body = await parseJson(req);
    const conversationId = assertUuid(body.conversationId, 'conversationId', {
      required: true,
    })!;
    const type = assertIn(body.type, 'type', ['text', 'template'] as const, {
      required: true,
    })!;
    const content = assertString(body.content, 'content');
    const templateName = assertString(body.templateName, 'templateName');
    const templateLanguage = assertString(
      body.templateLanguage,
      'templateLanguage',
    );
    const templateComponents = assertArray<unknown>(
      body.templateComponents,
      'templateComponents',
    );
    const sentBy = assertUuid(body.sentBy, 'sentBy', { required: true })!;

    try {
      const result = await sendMessage({
        conversationId: conversationId as string,
        type,
        content,
        templateName,
        templateLanguage,
        templateComponents,
        sentBy: sentBy as string,
      });
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
