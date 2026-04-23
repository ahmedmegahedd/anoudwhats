import { BadRequestError } from './errors';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function assertString(
  v: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean } = {},
): string | undefined {
  if (v === undefined || v === null) {
    if (opts.required) throw new BadRequestError(`${field} is required`);
    return undefined;
  }
  if (typeof v !== 'string') {
    throw new BadRequestError(`${field} must be a string`);
  }
  if (opts.min !== undefined && v.length < opts.min) {
    throw new BadRequestError(`${field} must be at least ${opts.min} chars`);
  }
  if (opts.max !== undefined && v.length > opts.max) {
    throw new BadRequestError(`${field} must be at most ${opts.max} chars`);
  }
  return v;
}

export function assertIn<T extends string>(
  v: unknown,
  field: string,
  values: readonly T[],
  opts: { required?: boolean } = {},
): T | undefined {
  if (v === undefined || v === null) {
    if (opts.required) throw new BadRequestError(`${field} is required`);
    return undefined;
  }
  if (!values.includes(v as T)) {
    throw new BadRequestError(
      `${field} must be one of: ${values.join(', ')}`,
    );
  }
  return v as T;
}

export function assertUuid(
  v: unknown,
  field: string,
  opts: { required?: boolean; nullable?: boolean } = {},
): string | null | undefined {
  if (v === null && opts.nullable) return null;
  if (v === undefined) {
    if (opts.required) throw new BadRequestError(`${field} is required`);
    return undefined;
  }
  if (!isUuid(v)) throw new BadRequestError(`${field} must be a valid UUID`);
  return v;
}

export function assertBoolean(
  v: unknown,
  field: string,
  opts: { required?: boolean } = {},
): boolean | undefined {
  if (v === undefined || v === null) {
    if (opts.required) throw new BadRequestError(`${field} is required`);
    return undefined;
  }
  if (typeof v !== 'boolean') {
    throw new BadRequestError(`${field} must be a boolean`);
  }
  return v;
}

export function assertNumber(
  v: unknown,
  field: string,
  opts: { required?: boolean; min?: number; max?: number; int?: boolean } = {},
): number | undefined {
  if (v === undefined || v === null) {
    if (opts.required) throw new BadRequestError(`${field} is required`);
    return undefined;
  }
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new BadRequestError(`${field} must be a number`);
  }
  if (opts.int && !Number.isInteger(v)) {
    throw new BadRequestError(`${field} must be an integer`);
  }
  if (opts.min !== undefined && v < opts.min) {
    throw new BadRequestError(`${field} must be >= ${opts.min}`);
  }
  if (opts.max !== undefined && v > opts.max) {
    throw new BadRequestError(`${field} must be <= ${opts.max}`);
  }
  return v;
}

export function assertArray<T>(
  v: unknown,
  field: string,
  opts: { required?: boolean; minLength?: number } = {},
): T[] | undefined {
  if (v === undefined || v === null) {
    if (opts.required) throw new BadRequestError(`${field} is required`);
    return undefined;
  }
  if (!Array.isArray(v)) {
    throw new BadRequestError(`${field} must be an array`);
  }
  if (opts.minLength !== undefined && v.length < opts.minLength) {
    throw new BadRequestError(
      `${field} must have at least ${opts.minLength} items`,
    );
  }
  return v as T[];
}

export async function parseJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestError('Request body must be a JSON object');
    }
    return body as Record<string, unknown>;
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    throw new BadRequestError('Invalid JSON body');
  }
}
