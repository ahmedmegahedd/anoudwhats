import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleAuthedRaw } from '@/lib/server/handler';
import { BadRequestError, HttpError } from '@/lib/server/errors';
import { isUuid } from '@/lib/server/validation';
import { sendMediaMessage } from '@/lib/server/services/messages';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return handleAuthedRaw(req, async ({ user, req }) => {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { message: 'content-type must be multipart/form-data' },
        { status: 400 },
      );
    }

    try {
      const form = await req.formData();
      const conversationId = form.get('conversationId');
      const rawSentBy = form.get('sentBy');
      const caption = form.get('caption');
      const file = form.get('file');

      if (typeof conversationId !== 'string' || !isUuid(conversationId)) {
        throw new BadRequestError('conversationId must be a valid UUID');
      }
      const sentBy =
        typeof rawSentBy === 'string' && isUuid(rawSentBy) ? rawSentBy : user.id;
      if (!(file instanceof File)) {
        throw new BadRequestError('file field is required');
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await sendMediaMessage({
        conversationId,
        sentBy,
        caption: typeof caption === 'string' && caption.trim() ? caption.trim() : undefined,
        file: {
          buffer,
          name: file.name || 'upload.bin',
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        },
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
