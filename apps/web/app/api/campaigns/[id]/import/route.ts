import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { BadRequestError } from '@/lib/server/errors';
import { importLeads } from '@/lib/server/services/campaigns';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleAuthed(req, async () => {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      throw new BadRequestError('No file uploaded (expected field "file")');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    return importLeads(params.id, buffer);
  });
}
