import { NextResponse } from 'next/server';
import { requireAuth, type SupabaseUser } from './auth';
import { HttpError } from './errors';

type Ctx = { user: SupabaseUser; req: Request };
type Handler<T> = (ctx: Ctx) => Promise<T> | T;

function toResponse(err: unknown): NextResponse {
  // Let Next's dynamic-rendering sentinel propagate so it can infer dynamic mode
  if (
    err &&
    typeof err === 'object' &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    ((err as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE' ||
      (err as { digest: string }).digest.startsWith('NEXT_'))
  ) {
    throw err;
  }
  if (err instanceof HttpError) {
    if (err.status >= 500) console.error('[API error]', err);
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
  const message =
    err instanceof Error ? err.message : 'Internal Server Error';
  const stack = err instanceof Error ? err.stack : undefined;
  console.error('[API error]', message, stack ?? err);
  return NextResponse.json({ message }, { status: 500 });
}

export async function handleAuthed<T>(
  req: Request,
  fn: Handler<T>,
): Promise<NextResponse> {
  try {
    const user = await requireAuth(req);
    const result = await fn({ user, req });
    if (result === undefined) return new NextResponse(null, { status: 204 });
    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err);
  }
}

export async function handlePublic<T>(
  req: Request,
  fn: (req: Request) => Promise<T> | T,
): Promise<NextResponse> {
  try {
    const result = await fn(req);
    if (result === undefined) return new NextResponse(null, { status: 204 });
    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err);
  }
}

export async function handleAuthedRaw(
  req: Request,
  fn: (ctx: Ctx) => Promise<Response> | Response,
): Promise<Response> {
  try {
    const user = await requireAuth(req);
    return await fn({ user, req });
  } catch (err) {
    return toResponse(err);
  }
}
