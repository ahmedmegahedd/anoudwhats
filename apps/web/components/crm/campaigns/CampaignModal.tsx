'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { Campaign } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const CHANNELS = ['WhatsApp', 'Facebook Ads', 'Instagram', 'Google Ads', 'Cold Import', 'Other'];
const SOURCES = ['Paid Ads', 'Organic', 'Referral', 'Cold Outreach', 'Event', 'Other'];

interface Props {
  campaign: Campaign | null;
  onClose: () => void;
  onSaved: (c: Campaign, mode: 'create' | 'edit') => void;
}

export default function CampaignModal({ campaign, onClose, onSaved }: Props) {
  const toast = useToast();
  const isEdit = !!campaign;

  const [name, setName] = useState(campaign?.name ?? '');
  const [channel, setChannel] = useState(campaign?.channel ?? '');
  const [source, setSource] = useState(campaign?.source ?? '');
  const [budget, setBudget] = useState(
    campaign?.budget !== null && campaign?.budget !== undefined
      ? String(campaign.budget)
      : '',
  );
  const [startDate, setStartDate] = useState(campaign?.start_date ?? '');
  const [endDate, setEndDate] = useState(campaign?.end_date ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function save() {
    if (!name.trim()) {
      toast('Campaign name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        channel: channel || undefined,
        source: source || undefined,
        budget: budget ? Number(budget) : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const url = isEdit
        ? `${API_URL}/campaigns/${campaign!.id}`
        : `${API_URL}/campaigns`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = (await res.json()) as Campaign;
      toast(isEdit ? 'Campaign updated' : 'Campaign created', 'success');
      onSaved(saved, isEdit ? 'edit' : 'create');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Campaign' : 'New Campaign'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Campaign Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramadan 2026"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">— None —</option>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">— None —</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Budget (EGP)">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </Field>
            <Field label="End Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
