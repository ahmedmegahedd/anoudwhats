import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/server/env';
import { processIncoming } from '@/lib/server/services/whatsapp';

export const dynamic = 'force-dynamic';
// Next.js route handlers in Node runtime give us raw body via req.text().
// Disable built-in body parsing by simply not calling req.json() before HMAC verify.

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get('hub.mode');
  const verifyToken = sp.get('hub.verify_token');
  const challenge = sp.get('hub.challenge');
  const expected = getEnv('META_WEBHOOK_VERIFY_TOKEN');

  if (mode === 'subscribe' && verifyToken === expected && challenge) {
    console.log('Meta webhook verified successfully');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  console.warn(
    `Webhook verification failed — mode=${mode} token_match=${verifyToken === expected}`,
  );
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  const appSecret = getEnv('META_APP_SECRET');

  if (appSecret && signature) {
    const expectedSig =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn('Invalid X-Hub-Signature-256');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }
  } else if (!appSecret) {
    console.warn('META_APP_SECRET not set — skipping signature verification');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  // Fire-and-forget processing — Meta requires <20s response
  void processIncoming(payload).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WEBHOOK] processIncoming failed: ${msg}`);
  });

  return NextResponse.json({ status: 'ok' });
}
