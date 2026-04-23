import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { findAutomationLogs } from '@/lib/server/services/automation';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => {
    const sp = new URL(req.url).searchParams;
    const result = sp.get('result');
    return findAutomationLogs({
      rule_id: sp.get('rule_id') ?? undefined,
      result:
        result === 'success' || result === 'failed' ? result : undefined,
    });
  });
}
