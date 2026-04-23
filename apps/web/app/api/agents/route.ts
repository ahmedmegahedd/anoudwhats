import type { NextRequest } from 'next/server';
import { handleAuthed } from '@/lib/server/handler';
import { findAllAgents } from '@/lib/server/services/agents';

export async function GET(req: NextRequest) {
  return handleAuthed(req, () => findAllAgents());
}
