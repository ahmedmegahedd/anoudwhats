import type { NextRequest } from 'next/server';
import { handleAuthedRaw } from '@/lib/server/handler';
import {
  exportContactsCsv,
  parseContactFilters,
} from '@/lib/server/services/contacts';

export async function GET(req: NextRequest) {
  return handleAuthedRaw(req, async () => {
    const url = new URL(req.url);
    const csv = await exportContactsCsv(parseContactFilters(url.searchParams));
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contacts-${date}.csv"`,
      },
    });
  });
}
