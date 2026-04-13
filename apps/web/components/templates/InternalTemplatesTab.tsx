'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InternalTemplateModal from './InternalTemplateModal';
import type { InternalTemplate } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type TypeFilter = 'ALL' | 'AUTO' | 'MANUAL';
type LangFilter = 'ALL' | 'en' | 'ar';

interface TriggerRule {
  type?: 'first_message' | 'outside_hours' | 'keyword' | 'always';
  keyword?: string;
}

export default function InternalTemplatesTab() {
  const toast = useToast();
  const [templates, setTemplates] = useState<InternalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [langFilter, setLangFilter] = useState<LangFilter>('ALL');
  const [editing, setEditing] = useState<InternalTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InternalTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/templates/internal`);
      const data = (await res.json()) as InternalTemplate[];
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_URL}/templates/internal/${deleteTarget.id}`, {
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

  function handleSaved(template: InternalTemplate, mode: 'create' | 'edit') {
    if (mode === 'create') {
      setTemplates((prev) => [template, ...prev]);
    } else {
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
    }
    setCreating(false);
    setEditing(null);
  }

  const filtered = templates.filter((t) => {
    if (typeFilter === 'AUTO' && !t.is_auto) return false;
    if (typeFilter === 'MANUAL' && t.is_auto) return false;
    if (langFilter !== 'ALL' && t.language !== langFilter) return false;
    return true;
  });

  return (
    <div className="p-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Internal Templates</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
        >
          + New Template
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Type:</span>
          <div className="flex gap-1">
            {(['ALL', 'AUTO', 'MANUAL'] as TypeFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setTypeFilter(opt)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  typeFilter === opt
                    ? 'bg-[#25D366] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt === 'ALL'
                  ? 'All'
                  : opt === 'AUTO'
                  ? 'Auto-response'
                  : 'Manual'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Language:</span>
          <div className="flex gap-1">
            {(['ALL', 'en', 'ar'] as LangFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setLangFilter(opt)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  langFilter === opt
                    ? 'bg-[#25D366] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt === 'ALL' ? 'All' : opt === 'en' ? 'English' : 'Arabic'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <p className="text-sm text-gray-500">
            No internal templates yet. Click &apos;+ New Template&apos; to create one.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {filtered.map((t) => (
            <InternalTemplateRow
              key={t.id}
              template={t}
              onEdit={() => setEditing(t)}
              onDelete={() => setDeleteTarget(t)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <InternalTemplateModal
          template={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
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

// ── Row ────────────────────────────────────────────────────────────────────

function InternalTemplateRow({
  template,
  onEdit,
  onDelete,
}: {
  template: InternalTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const langFlag = template.language === 'ar' ? '🇸🇦' : '🇬🇧';
  const triggerDesc = template.is_auto
    ? describeTrigger(template.trigger_rule as TriggerRule | null)
    : null;

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{template.title}</p>
          {template.category && (
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {template.category}
            </span>
          )}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              template.is_auto
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {template.is_auto ? 'Auto' : 'Manual'}
          </span>
          <span className="text-xs">
            {langFlag}{' '}
            <span className="text-gray-500 uppercase">{template.language}</span>
          </span>
        </div>
        {triggerDesc && (
          <p className="text-[11px] text-green-700 italic mb-1">{triggerDesc}</p>
        )}
        <p className="text-xs text-gray-500 truncate">
          {truncate(template.content, 80)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded-lg transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function describeTrigger(rule: TriggerRule | null): string {
  if (!rule?.type) return 'Always fires';
  switch (rule.type) {
    case 'first_message':
      return 'Fires on: First message';
    case 'outside_hours':
      return 'Fires on: Outside hours';
    case 'keyword':
      return `Fires on keyword: '${rule.keyword ?? ''}'`;
    case 'always':
      return 'Always fires';
    default:
      return '';
  }
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n) + '…';
}
