'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import { formatEGP, stageColor } from './shared';
import type { PipelineFilters } from '@/hooks/usePipeline';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ForecastStage {
  stage: string;
  count: number;
  totalValue: number;
  probability: number;
  weightedValue: number;
}

interface ForecastData {
  stages: ForecastStage[];
  totalPipeline: number;
  weightedForecast: number;
  wonThisMonth: number;
}

interface Props {
  filters: PipelineFilters;
  refreshKey: number;
}

export default function ForecastView({ filters, refreshKey }: Props) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.campaign_id) params.set('campaign_id', filters.campaign_id);
        if (filters.agent_id) params.set('agent_id', filters.agent_id);
        if (filters.channel) params.set('channel', filters.channel);
        if (filters.source) params.set('source', filters.source);
        const res = await apiFetch(`${API_URL}/pipeline/forecast?${params.toString()}`);
        if (!res.ok) throw new Error('Failed');
        const body = (await res.json()) as ForecastData;
        if (cancelled) return;
        setData(body);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshKey]);

  if (loading && !data) {
    return <p className="text-sm text-gray-400 px-6 py-4">Loading forecast…</p>;
  }
  if (!data) return null;

  const activeDeals = data.stages
    .filter((s) => s.stage !== 'Lost')
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="px-6 py-5 overflow-y-auto h-full">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard
          label="Total Pipeline Value"
          value={formatEGP(data.totalPipeline)}
          icon="💰"
        />
        <SummaryCard
          label="Weighted Forecast"
          value={formatEGP(data.weightedForecast)}
          icon="📊"
        />
        <SummaryCard
          label="Won This Month"
          value={formatEGP(data.wonThisMonth)}
          icon="🏆"
          tone="green"
        />
        <SummaryCard
          label="Deals in Pipeline"
          value={activeDeals.toLocaleString()}
          icon="📋"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <HeaderCell>Stage</HeaderCell>
              <HeaderCell>Deals</HeaderCell>
              <HeaderCell>Total Value</HeaderCell>
              <HeaderCell>Probability</HeaderCell>
              <HeaderCell>Weighted Value</HeaderCell>
              <HeaderCell>Progress</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.stages.map((row) => {
              const color = stageColor(row.stage);
              const bg = `${color}15`; // 15 = ~8% alpha
              return (
                <tr key={row.stage} style={{ backgroundColor: bg }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {row.stage}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{row.count}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {formatEGP(row.totalValue)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {row.probability}%
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {formatEGP(row.weightedValue)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full min-w-[120px]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.probability}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-4 py-3 text-xs font-bold text-gray-700">Totals</td>
              <td className="px-4 py-3 text-xs font-bold text-gray-900">
                {data.stages.reduce((sum, s) => sum + s.count, 0)}
              </td>
              <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">
                {formatEGP(
                  data.stages.reduce((sum, s) => sum + s.totalValue, 0),
                )}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">
                {formatEGP(data.weightedForecast)}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-500 italic">
        💡 Weighted forecast multiplies each deal&apos;s value by the stage&apos;s
        win probability. This gives a realistic revenue prediction.
      </p>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">
      {children}
    </th>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: string;
  tone?: 'green';
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p
        className={`text-xl font-bold ${tone === 'green' ? 'text-[#128C7E]' : 'text-gray-900'}`}
      >
        {value}
      </p>
    </div>
  );
}
