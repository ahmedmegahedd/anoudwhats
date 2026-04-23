import { getSupabaseAdmin } from '../supabase';
import { requireEnv } from '../env';
import { BadRequestError } from '../errors';
import { metaFetch } from '../meta';

export interface DayHours {
  open: boolean;
  start: string;
  end: string;
}

export interface BusinessHours {
  days: DayHours[];
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: [
    { open: true, start: '09:00', end: '18:00' },
    { open: true, start: '09:00', end: '18:00' },
    { open: true, start: '09:00', end: '18:00' },
    { open: true, start: '09:00', end: '18:00' },
    { open: true, start: '09:00', end: '18:00' },
    { open: false, start: '09:00', end: '18:00' },
    { open: false, start: '09:00', end: '18:00' },
  ],
};

const CACHE_TTL_MS = 30_000;
let cache: { value: BusinessHours; fetchedAt: number } | null = null;

export async function getBusinessHours(): Promise<BusinessHours> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('app_settings')
    .select('value')
    .eq('key', 'business_hours')
    .maybeSingle();
  if (error) {
    console.warn(`[settings] getBusinessHours failed: ${error.message}`);
    return DEFAULT_BUSINESS_HOURS;
  }
  const value =
    (data?.value as BusinessHours | undefined) ?? DEFAULT_BUSINESS_HOURS;
  cache = { value, fetchedAt: Date.now() };
  return value;
}

export async function setBusinessHours(
  hours: BusinessHours,
): Promise<BusinessHours> {
  if (!Array.isArray(hours.days) || hours.days.length !== 7) {
    throw new BadRequestError('days must be an array of 7 entries');
  }
  const db = getSupabaseAdmin();
  const { error } = await db.from('app_settings').upsert({
    key: 'business_hours',
    value: hours,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new BadRequestError(error.message);
  cache = { value: hours, fetchedAt: Date.now() };
  return hours;
}

export async function testMetaConnection(): Promise<{
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}> {
  try {
    const phoneNumberId = requireEnv('META_PHONE_NUMBER_ID');
    const data = await metaFetch<{ display_phone_number?: string }>(
      `/${phoneNumberId}`,
    );
    return {
      connected: true,
      phoneNumber: data?.display_phone_number ?? phoneNumberId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, error: msg };
  }
}

export async function isOutsideBusinessHours(): Promise<boolean> {
  const hours = await getBusinessHours();
  const now = new Date();
  const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const day = cairo.getUTCDay();
  const today = hours.days[day];
  if (!today?.open) return true;
  const minutes = cairo.getUTCHours() * 60 + cairo.getUTCMinutes();
  const [sh, sm] = today.start.split(':').map(Number);
  const [eh, em] = today.end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return minutes < start || minutes >= end;
}
