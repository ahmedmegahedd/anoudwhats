import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { BadRequestError } from '@/lib/server/errors';
import { importContactsCsv } from '@/lib/server/services/contacts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return handleAuthed(req, async ({ req }) => {
    const contentType = req.headers.get('content-type') ?? '';
    let csvText: string;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        throw new BadRequestError('file field is required');
      }
      csvText = await file.text();
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      csvText = await req.text();
    } else {
      const body = (await req.json()) as { csv?: string };
      if (typeof body.csv !== 'string') {
        throw new BadRequestError('csv text is required');
      }
      csvText = body.csv;
    }

    if (!csvText.trim()) {
      throw new BadRequestError('CSV is empty');
    }

    return importContactsCsv(csvText);
  });
}
