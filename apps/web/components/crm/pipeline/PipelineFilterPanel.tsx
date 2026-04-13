'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAgents } from '@/hooks/useAgents';
import type { PipelineFilters } from '@/hooks/usePipeline';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props {
  open: boolean;
  filters: PipelineFilters;
  onClose: () => void;
  onApply: (filters: PipelineFilters) => void;
}

export default function PipelineFilterPanel({
  open,
  filters,
  onClose,
  onApply,
}: Props) {
  const { campaigns } = useCampaigns();
  const { agents } = useAgents();
  const [draft, setDraft] = useState<PipelineFilters>(filters);
  const [channels, setChannels] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    setDraft(filters);
  }, [filters, open]);

  useEffect(() => {
    (async () => {
      try {
        const [chRes, srcRes] = await Promise.all([
          apiFetch(`${API_URL}/contacts/channels`),
          apiFetch(`${API_URL}/contacts/sources`),
        ]);
        if (chRes.ok) setChannels((await chRes.json()) as string[]);
        if (srcRes.ok) setSources((await srcRes.json()) as string[]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[320px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <Section title="Campaign">
            <select
              value={draft.campaign_id ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, campaign_id: e.target.value || undefined })
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Section>

          <Section title="Assigned Agent">
            <select
              value={draft.agent_id ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, agent_id: e.target.value || undefined })
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </Section>

          <Section title="Channel">
            {channels.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">No channels yet</p>
            ) : (
              <select
                value={draft.channel ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, channel: e.target.value || undefined })
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">All Channels</option>
                {channels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Section>

          <Section title="Source">
            {sources.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">No sources yet</p>
            ) : (
              <select
                value={draft.source ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, source: e.target.value || undefined })
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">All Sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Section>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setDraft({})}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            Clear
          </button>
          <button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E]"
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function countPipelineFilters(f: PipelineFilters): number {
  let count = 0;
  if (f.campaign_id) count++;
  if (f.agent_id) count++;
  if (f.channel) count++;
  if (f.source) count++;
  return count;
}
