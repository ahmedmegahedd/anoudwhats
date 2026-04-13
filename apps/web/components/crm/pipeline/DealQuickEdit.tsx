'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/Toast';
import { useAgents } from '@/hooks/useAgents';
import { PIPELINE_STAGES } from './shared';
import type { DealCard } from '@/hooks/usePipeline';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props {
  deal: DealCard;
  anchor: HTMLElement;
  onClose: () => void;
  onSaved: () => void;
}

export default function DealQuickEdit({ deal, anchor, onClose, onSaved }: Props) {
  const toast = useToast();
  const { agents } = useAgents();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState(deal.pipeline_stage);
  const [dealValue, setDealValue] = useState(
    deal.deal_value !== null && deal.deal_value !== undefined
      ? String(deal.deal_value)
      : '',
  );
  const [agentId, setAgentId] = useState(deal.assigned_agent_id ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        pipeline_stage: stage,
        deal_value: dealValue ? Number(dealValue) : null,
        assigned_agent_id: agentId || null,
      };
      const res = await apiFetch(`${API_URL}/pipeline/${deal.id}/deal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Deal updated', 'success');
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const rect = anchor.getBoundingClientRect();
  const style: React.CSSProperties = {
    top: `${rect.bottom + 4}px`,
    left: `${Math.max(8, rect.right - 280)}px`,
    width: '280px',
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={style}
        className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4"
      >
        <p className="text-xs font-semibold text-gray-900 mb-3 truncate">
          Quick Edit — {deal.name ?? deal.phone}
        </p>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Deal Value</label>
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="0"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">— Unassigned —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#25D366] rounded hover:bg-[#128C7E] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
