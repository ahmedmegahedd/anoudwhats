'use client';

import { useState } from 'react';
import type { ContactStatsData } from './StatsBar';

interface Props {
  stats: ContactStatsData | null;
}

export default function ChannelSourceChart({ stats }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">
            📊 Where is your data coming from?
          </p>
          <p className="text-[11px] text-gray-500">
            Breakdown by channel, source and campaign
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-4 py-4 border-t border-gray-100 bg-gray-50/50">
          <BarChart
            title="By Channel"
            items={stats.byChannel.map((c) => ({
              label: c.channel,
              count: c.count,
            }))}
            barColor="#25D366"
          />
          <BarChart
            title="By Source"
            items={stats.bySource.map((s) => ({
              label: s.source,
              count: s.count,
            }))}
            barColor="#3B82F6"
          />
          <BarChart
            title="Top Campaigns"
            items={stats.byCampaign.map((c) => ({
              label: c.name,
              count: c.count,
            }))}
            barColor="#8B5CF6"
          />
        </div>
      )}
    </div>
  );
}

function BarChart({
  title,
  items,
  barColor,
}: {
  title: string;
  items: { label: string; count: number }[];
  barColor: string;
}) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">No data yet</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            const width = `${(item.count / max) * 100}%`;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-gray-700 font-medium truncate max-w-[60%]">
                    {item.label}
                  </span>
                  <span className="text-gray-500">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
