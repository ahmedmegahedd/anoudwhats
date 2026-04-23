'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { WaTemplate } from '@anoud-job/types';

const API_URL = '/api';

type StatusFilter = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED';
type CategoryFilter = 'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export default function WaTemplatesTab() {
  const toast = useToast();
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<WaTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/templates/wa`);
      const data = (await res.json()) as WaTemplate[];
      setTemplates(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    try {
      const res = await apiFetch(`${API_URL}/templates/wa/sync`, { method: 'POST' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Sync failed');
      }
      const data = (await res.json()) as { synced: number; total: number };
      toast(`Synced ${data.synced} templates`, 'success');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      toast(msg, 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_URL}/templates/wa/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast('Template deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  const filtered = templates.filter((t) => {
    if (status !== 'ALL' && (t.status ?? '').toUpperCase() !== status) return false;
    if (category !== 'ALL' && (t.category ?? '').toUpperCase() !== category) return false;
    return true;
  });

  return (
    <div className="p-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">WhatsApp Templates</h2>
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors"
        >
          {syncing ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {syncing ? 'Syncing…' : 'Sync from Meta'}
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 mb-5">
        <FilterPills<StatusFilter>
          label="Status"
          value={status}
          onChange={setStatus}
          options={['ALL', 'APPROVED', 'PENDING', 'REJECTED']}
        />
        <FilterPills<CategoryFilter>
          label="Category"
          value={category}
          onChange={setCategory}
          options={['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION']}
        />
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <WaTemplateCard
              key={t.id}
              template={t}
              onDelete={() => setDeleteTarget(t)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template?"
        description="This template will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────

function WaTemplateCard({
  template,
  onDelete,
}: {
  template: WaTemplate;
  onDelete: () => void;
}) {
  const bodyText = extractBodyText(template.components);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-sm font-bold text-gray-900 break-all">
          {template.name}
        </p>
        <button
          onClick={onDelete}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CategoryBadge category={template.category} />
        <StatusBadge status={template.status} />
        {template.language && (
          <span className="text-[10px] text-gray-500 uppercase">{template.language}</span>
        )}
      </div>

      {/* Body preview */}
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 flex-1 min-h-[3em]">
        {bodyText || <span className="italic text-gray-400">No body text</span>}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">
          Synced {relativeTime(template.last_synced_at)}
        </span>
        <button
          disabled
          title="Open a conversation first"
          className="text-xs px-2.5 py-1 text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
        >
          Use in Chat
        </button>
      </div>
    </div>
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const upper = category.toUpperCase();
  const styles: Record<string, string> = {
    MARKETING: 'bg-orange-100 text-orange-700',
    UTILITY: 'bg-blue-100 text-blue-700',
    AUTHENTICATION: 'bg-purple-100 text-purple-700',
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        styles[upper] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {upper}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const upper = status.toUpperCase();
  const styles: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        styles[upper] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {upper}
    </span>
  );
}

// ── Filter Pills ───────────────────────────────────────────────────────────

function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}:</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              value === opt
                ? 'bg-[#25D366] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt === 'ALL' ? 'All' : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
      <p className="text-sm text-gray-500">
        No templates synced yet. Click &apos;Sync from Meta&apos; to import your
        approved templates.
      </p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function extractBodyText(components: unknown): string {
  if (!components) return '';
  const list = Array.isArray(components)
    ? (components as Array<Record<string, unknown>>)
    : [];
  const body = list.find(
    (c) => typeof c?.type === 'string' && (c.type as string).toUpperCase() === 'BODY',
  );
  return (body?.text as string) ?? '';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
