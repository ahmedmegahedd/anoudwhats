'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DayHours {
  open: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  days: DayHours[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS: BusinessHours = {
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

export default function BusinessHoursTab() {
  const toast = useToast();
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/business-hours`);
        if (res.ok) {
          const data = (await res.json()) as BusinessHours;
          if (data?.days?.length === 7) setHours(data);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateDay(index: number, patch: Partial<DayHours>) {
    setHours((prev) => ({
      days: prev.days.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/settings/business-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Business hours saved', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <p className="text-xs text-gray-500 mb-4">
        Configure when your team is available. Used by the automation engine
        to detect outside-hours messages.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {hours.days.map((day, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-24">
              <p className="text-sm font-medium text-gray-900">{DAY_NAMES[i]}</p>
            </div>
            <button
              type="button"
              onClick={() => updateDay(i, { open: !day.open })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                day.open ? 'bg-[#25D366]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  day.open ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            {day.open ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={day.start}
                  onChange={(e) => updateDay(i, { start: e.target.value })}
                  className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="time"
                  value={day.end}
                  onChange={(e) => updateDay(i, { end: e.target.value })}
                  className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                />
              </div>
            ) : (
              <span className="text-xs text-gray-400">Closed</span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save Business Hours'}
      </button>
    </div>
  );
}
