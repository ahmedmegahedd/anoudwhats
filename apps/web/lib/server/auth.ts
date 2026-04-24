import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UnauthorizedError } from './errors';

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) env var',
    );
  }
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      'Missing SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) env var',
    );
  }
  return { url, anonKey };
}

async function userFromBearer(token: string): Promise<SupabaseUser | null> {
  const { url, anonKey } = getSupabaseEnv();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!res.ok) return null;
  return (await res.json()) as SupabaseUser;
}

async function userFromCookies(): Promise<SupabaseUser | null> {
  const { url, anonKey } = getSupabaseEnv();
  const store = cookies();
  const client = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set() {
        /* read-only in API routes */
      },
      remove() {
        /* read-only in API routes */
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? undefined,
    user_metadata: data.user.user_metadata as Record<string, unknown>,
  };
}

export async function requireAuth(req: Request): Promise<SupabaseUser> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (token) {
    const user = await userFromBearer(token);
    if (user) return user;
  }

  const cookieUser = await userFromCookies();
  if (cookieUser) return cookieUser;

  throw new UnauthorizedError('Not authenticated');
}
