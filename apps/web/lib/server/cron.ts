import { syncTemplatesFromMeta } from './services/templates';

let started = false;

function msUntilNextMidnightUtc(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  return next.getTime() - now.getTime();
}

async function runDailyTemplateSync() {
  try {
    const result = await syncTemplatesFromMeta();
    console.log(
      `[CRON] Daily template sync: ${result.synced}/${result.total}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CRON] Daily template sync failed: ${msg}`);
  }
}

function scheduleDailyAtMidnight() {
  const delay = msUntilNextMidnightUtc();
  setTimeout(() => {
    void runDailyTemplateSync();
    // Re-schedule every 24h
    setInterval(() => {
      void runDailyTemplateSync();
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

export function startCronJobs() {
  if (started) return;
  started = true;
  scheduleDailyAtMidnight();
  console.log('[CRON] Daily template sync scheduled (00:00 UTC)');
}
