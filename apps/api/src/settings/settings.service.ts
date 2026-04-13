import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

export interface DayHours {
  open: boolean;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface BusinessHours {
  // 0=Sunday .. 6=Saturday
  days: DayHours[];
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: [
    { open: true, start: '09:00', end: '18:00' }, // Sun
    { open: true, start: '09:00', end: '18:00' }, // Mon
    { open: true, start: '09:00', end: '18:00' }, // Tue
    { open: true, start: '09:00', end: '18:00' }, // Wed
    { open: true, start: '09:00', end: '18:00' }, // Thu
    { open: false, start: '09:00', end: '18:00' }, // Fri
    { open: false, start: '09:00', end: '18:00' }, // Sat
  ],
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private hoursCache: { value: BusinessHours; fetchedAt: number } | null = null;
  private readonly CACHE_TTL_MS = 30_000;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getBusinessHours(): Promise<BusinessHours> {
    // Cache hit
    if (
      this.hoursCache &&
      Date.now() - this.hoursCache.fetchedAt < this.CACHE_TTL_MS
    ) {
      return this.hoursCache.value;
    }

    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', 'business_hours')
      .maybeSingle();

    if (error) {
      this.logger.warn(`getBusinessHours failed: ${error.message}`);
      return DEFAULT_BUSINESS_HOURS;
    }

    const value =
      (data?.value as BusinessHours | undefined) ?? DEFAULT_BUSINESS_HOURS;
    this.hoursCache = { value, fetchedAt: Date.now() };
    return value;
  }

  async setBusinessHours(hours: BusinessHours): Promise<BusinessHours> {
    if (!Array.isArray(hours.days) || hours.days.length !== 7) {
      throw new BadRequestException('days must be an array of 7 entries');
    }
    const db = this.supabaseService.getClient();
    const { error } = await db.from('app_settings').upsert({
      key: 'business_hours',
      value: hours,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new BadRequestException(error.message);

    // Invalidate cache
    this.hoursCache = { value: hours, fetchedAt: Date.now() };
    return hours;
  }

  async testConnection(): Promise<{
    connected: boolean;
    phoneNumber?: string;
    error?: string;
  }> {
    try {
      const phoneNumberId =
        this.config.getOrThrow<string>('META_PHONE_NUMBER_ID');
      const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}`;

      const { data } = await firstValueFrom(
        this.httpService.get<{ display_phone_number?: string }>(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
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

  /**
   * Evaluates whether the current Cairo time is outside the configured
   * business hours. Used by the automation engine.
   */
  async isOutsideBusinessHours(): Promise<boolean> {
    const hours = await this.getBusinessHours();
    const now = new Date();
    // Cairo is UTC+2 (DST disabled for MVP simplicity)
    const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const day = cairo.getUTCDay(); // 0=Sun..6=Sat
    const today = hours.days[day];
    if (!today?.open) return true;

    const minutes = cairo.getUTCHours() * 60 + cairo.getUTCMinutes();
    const [sh, sm] = today.start.split(':').map(Number);
    const [eh, em] = today.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return minutes < start || minutes >= end;
  }
}
