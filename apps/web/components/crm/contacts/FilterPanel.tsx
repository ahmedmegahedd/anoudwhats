'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAgents } from '@/hooks/useAgents';
import type { ContactFilters } from '@/hooks/useContacts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const PIPELINE_STAGES = [
  'Lead',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
];

interface Props {
  open: boolean;
  filters: ContactFilters;
  onClose: () => void;
  onApply: (filters: ContactFilters) => void;
}

export default function FilterPanel({ open, filters, onClose, onApply }: Props) {
  const { campaigns } = useCampaigns();
  const { agents } = useAgents();
  const [channels, setChannels] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [draft, setDraft] = useState<ContactFilters>(filters);

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

  function toggleArrayValue(key: 'channel' | 'source' | 'pipeline_stage', value: string) {
    setDraft((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  function clearAll() {
    setDraft({});
  }

  function apply() {
    onApply(draft);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 bottom-0 w-[320px] bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Channel */}
          <Section title="Channel">
            {channels.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">No channels yet</p>
            ) : (
              <div className="space-y-1">
                {channels.map((ch) => (
                  <CheckboxRow
                    key={ch}
                    label={ch}
                    checked={(draft.channel ?? []).includes(ch)}
                    onChange={() => toggleArrayValue('channel', ch)}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Source */}
          <Section title="Source">
            {sources.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">No sources yet</p>
            ) : (
              <div className="space-y-1">
                {sources.map((s) => (
                  <CheckboxRow
                    key={s}
                    label={s}
                    checked={(draft.source ?? []).includes(s)}
                    onChange={() => toggleArrayValue('source', s)}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Campaign */}
          <Section title="Campaign">
            <select
              value={draft.campaign_id ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  campaign_id: e.target.value || undefined,
                })
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

          {/* Pipeline Stage */}
          <Section title="Pipeline Stage">
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((stage) => {
                const active = (draft.pipeline_stage ?? []).includes(stage);
                return (
                  <button
                    key={stage}
                    onClick={() => toggleArrayValue('pipeline_stage', stage)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                      active
                        ? 'bg-[#25D366] text-white'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {stage}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Assigned Agent */}
          <Section title="Assigned Agent">
            <select
              value={draft.assigned_agent_id ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  assigned_agent_id: e.target.value || undefined,
                })
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

          {/* Tag */}
          <Section title="Tag">
            <input
              type="text"
              value={draft.tag ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, tag: e.target.value || undefined })
              }
              placeholder="e.g. vip, hot-lead"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </Section>

          {/* Date Range */}
          <Section title="Date Range">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={draft.date_from ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      date_from: e.target.value || undefined,
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={draft.date_to ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      date_to: e.target.value || undefined,
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={clearAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={apply}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            Apply Filters
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

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export function countActiveFilters(f: ContactFilters): number {
  let count = 0;
  if (f.search) count++;
  if (f.channel?.length) count++;
  if (f.source?.length) count++;
  if (f.campaign_id) count++;
  if (f.pipeline_stage?.length) count++;
  if (f.assigned_agent_id) count++;
  if (f.tag) count++;
  if (f.date_from || f.date_to) count++;
  return count;
}
