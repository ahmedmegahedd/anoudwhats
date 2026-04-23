import { requireEnv } from './env';

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

export async function metaFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = requireEnv('META_ACCESS_TOKEN');
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body && !(init.body instanceof ArrayBuffer)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meta API ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<string | null> {
  const phoneNumberId = requireEnv('META_PHONE_NUMBER_ID');
  const data = await metaFetch<{ messages?: { id: string }[] }>(
    `/${phoneNumberId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    },
  );
  return data?.messages?.[0]?.id ?? null;
}

export async function sendWhatsAppTemplate(
  to: string,
  name: string,
  language: string,
  components: unknown[] = [],
): Promise<string | null> {
  const phoneNumberId = requireEnv('META_PHONE_NUMBER_ID');
  const data = await metaFetch<{ messages?: { id: string }[] }>(
    `/${phoneNumberId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name,
          language: { code: language },
          components,
        },
      }),
    },
  );
  return data?.messages?.[0]?.id ?? null;
}
