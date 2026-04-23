import { requireEnv } from './env';
import { UnauthorizedError } from './errors';

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export async function requireAuth(req: Request): Promise<SupabaseUser> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;
  if (!token) throw new UnauthorizedError('Missing authorization token');

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseKey) throw new Error('Missing SUPABASE_ANON_KEY');

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey },
  });
  if (!res.ok) throw new UnauthorizedError('Invalid token');

  return (await res.json()) as SupabaseUser;
}
