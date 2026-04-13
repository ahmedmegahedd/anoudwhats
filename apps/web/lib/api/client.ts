'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Drop-in wrapper around `fetch` that:
 * - Injects the current Supabase session JWT as a Bearer token
 * - Sets Content-Type: application/json by default (skipped for FormData)
 * - Redirects to /login on 401
 *
 * Accepts the same arguments as fetch.
 */
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const incomingHeaders =
    (init?.headers as Record<string, string> | undefined) ?? {};
  const headers: Record<string, string> = { ...incomingHeaders };

  // Don't override Content-Type for FormData (browser sets multipart boundary)
  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isFormData && !('Content-Type' in headers) && !('content-type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    // Avoid redirect loops on the login page itself
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}
