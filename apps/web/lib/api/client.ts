'use client';

const REQUEST_TIMEOUT_MS = 30_000;

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const incomingHeaders =
    (init?.headers as Record<string, string> | undefined) ?? {};
  const headers: Record<string, string> = { ...incomingHeaders };

  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isFormData && !('Content-Type' in headers) && !('content-type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers,
      credentials: 'same-origin',
      signal: init?.signal ?? controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error(`[apiFetch] timeout after ${REQUEST_TIMEOUT_MS}ms: ${input}`);
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${input}`,
      );
    }
    console.error(`[apiFetch] network error for ${input}:`, err);
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    console.warn(`[apiFetch] ${res.status} ${input}`);
  }

  if (res.status === 401 && typeof window !== 'undefined') {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}
