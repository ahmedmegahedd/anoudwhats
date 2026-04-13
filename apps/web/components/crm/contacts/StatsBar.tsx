'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ContactStatsData {
  total: number;
  newToday: number;
  newThisWeek: number;
  byChannel: { channel: string; count: number }[];
  bySource: { source: string; count: number }[];
  byCampaign: { name: string; count: number }[];
  byStage: { stage: string; count: number }[];
}

interface Props {
  onStatsLoaded?: (stats: ContactStatsData) => void;
  refreshKey?: number;
}

export default function StatsBar({ onStatsLoaded, refreshKey }: Props) {
  const [stats, setStats] = useState<ContactStatsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/contacts/stats`);
        if (!res.ok) return;
        const data = (await res.json()) as ContactStatsData;
        if (cancelled) return;
        setStats(data);
        onStatsLoaded?.(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const cards = [
    {
      label: 'Total Contacts',
      value: stats?.total ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      tone: 'text-gray-500 bg-gray-50',
    },
    {
      label: 'New Today',
      value: stats?.newToday ?? 0,
      icon: <span className="text-base">📈</span>,
      tone: 'text-green-700 bg-green-50',
    },
    {
      label: 'New This Week',
      value: stats?.newThisWeek ?? 0,
      icon: <span className="text-base">📅</span>,
      tone: 'text-blue-700 bg-blue-50',
    },
    {
      label: 'Active Channels',
      value: stats?.byChannel?.length ?? 0,
      icon: <span className="text-base">📡</span>,
      tone: 'text-purple-700 bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.tone}`}
          >
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">
              {card.label}
            </p>
            <p className="text-xl font-bold text-gray-900 leading-tight">
              {card.value.toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
