'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RuleBuilderModal from './RuleBuilderModal';
import type {
  AutomationAction,
  AutomationActionType,
  AutomationRule,
  AutomationTriggerType,
} from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TRIGGER_META: Record<
  AutomationTriggerType,
  { label: string; className: string }
> = {
  message_received: { label: 'Every Message', className: 'bg-blue-100 text-blue-700' },
  conversation_opened: { label: 'New Conversation', className: 'bg-green-100 text-green-700' },
  conversation_resolved: { label: 'On Resolve', className: 'bg-gray-100 text-gray-600' },
  keyword_match: { label: 'Keyword Match', className: 'bg-orange-100 text-orange-700' },
  no_reply_timeout: { label: 'No Reply Timeout', className: 'bg-red-100 text-red-700' },
};

const ACTION_ICON: Record<AutomationActionType, string> = {
  send_message: '💬',
  assign_agent: '👤',
  assign_team: '👥',
  add_tag: '🏷️',
  change_stage: '📊',
  send_wa_template: '📋',
};

export default function RulesList() {
  const toast = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/automation/rules`);
      if (!res.ok) throw new Error(await res.text());
      setRules((await res.json()) as AutomationRule[]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load rules', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(rule: AutomationRule) {
    try {
      const res = await apiFetch(`${API_URL}/automation/rules/${rule.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.is_active }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as AutomationRule;
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Toggle failed', 'error');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_URL}/automation/rules/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast('Rule deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  function handleSaved(rule: AutomationRule, mode: 'create' | 'edit') {
    if (mode === 'create') {
      setRules((prev) => [rule, ...prev]);
    } else {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    }
    setCreating(false);
    setEditing(null);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Automation Rules</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
        >
          + New Rule
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            No automation rules yet. Create your first rule to automate
            responses and assignments.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={() => toggleActive(rule)}
              onEdit={() => setEditing(rule)}
              onDelete={() => setDeleteTarget(rule)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <RuleBuilderModal
          rule={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rule?"
        description="This automation rule will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AutomationRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const triggerMeta = TRIGGER_META[rule.trigger_type] ?? {
    label: rule.trigger_type,
    className: 'bg-gray-100 text-gray-600',
  };
  const conditionCount = rule.conditions?.length ?? 0;
  const actions = (rule.actions ?? []) as AutomationAction[];

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          rule.is_active ? 'bg-[#25D366]' : 'bg-gray-300'
        }`}
        title={rule.is_active ? 'Active' : 'Inactive'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            rule.is_active ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${triggerMeta.className}`}
          >
            {triggerMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-gray-500">
            {conditionCount} condition{conditionCount === 1 ? '' : 's'}
          </span>
          {actions.length > 0 && (
            <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
              {actions.map((a, i) => (
                <span key={i} title={a.type}>
                  {ACTION_ICON[a.type] ?? '•'}
                </span>
              ))}
            </span>
          )}
          <span className="text-[11px] text-gray-400">
            Last run: {rule.last_run_at ? relativeTime(rule.last_run_at) : 'Never'}
          </span>
        </div>
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
