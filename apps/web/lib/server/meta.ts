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

export async function uploadMediaToMeta(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const phoneNumberId = requireEnv('META_PHONE_NUMBER_ID');
  const accessToken = requireEnv('META_ACCESS_TOKEN');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append(
    'file',
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    fileName,
  );
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meta media upload ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error('Meta media upload: no id returned');
  return data.id;
}

export async function sendWhatsAppMedia(
  to: string,
  mediaId: string,
  kind: 'image' | 'video' | 'audio' | 'document',
  opts: { caption?: string; fileName?: string } = {},
): Promise<string | null> {
  const phoneNumberId = requireEnv('META_PHONE_NUMBER_ID');
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: kind,
  };
  const mediaObj: Record<string, unknown> = { id: mediaId };
  if (opts.caption && (kind === 'image' || kind === 'video' || kind === 'document')) {
    mediaObj.caption = opts.caption;
  }
  if (opts.fileName && kind === 'document') {
    mediaObj.filename = opts.fileName;
  }
  payload[kind] = mediaObj;
  const data = await metaFetch<{ messages?: { id: string }[] }>(
    `/${phoneNumberId}/messages`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data?.messages?.[0]?.id ?? null;
}
