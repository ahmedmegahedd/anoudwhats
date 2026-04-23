'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { AutomationLog, AutomationRule, AutomationResult } from '@anoud-job/types';

const API_URL = '/api';

type ResultFilter = 'ALL' | AutomationResult;

interface LogWithDetails extends AutomationLog {
  rule_name: string | null;
  conversations?: {
    contacts?: { name: string | null; phone: string } | null;
  } | null;
}

export default function LogsTab() {
  const toast = useToast();
  const [logs, setLogs] = useState<LogWithDetails[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL');
  const [ruleFilter, setRuleFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resultFilter !== 'ALL') params.set('result', resultFilter);
      if (ruleFilter !== 'ALL') params.set('rule_id', ruleFilter);
      const res = await apiFetch(`${API_URL}/automation/logs?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as LogWithDetails[];
      setLogs(data);
      setVisibleCount(50);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [resultFilter, ruleFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/automation/rules`);
        if (res.ok) setRules((await res.json()) as AutomationRule[]);
      } catch {
        /* silent */
      }
    })();
  }, []);

  const visible = logs.slice(0, visibleCount);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Automation Logs</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Result pills */}
          <div className="flex gap-1">
            {(['ALL', 'success', 'failed'] as ResultFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setResultFilter(opt)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  resultFilter === opt
                    ? 'bg-[#25D366] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt === 'ALL'
                  ? 'All Results'
                  : opt === 'success'
                  ? 'Success'
                  : 'Failed'}
              </button>
            ))}
          </div>
          {/* Rule select */}
          <select
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          >
            <option value="ALL">All Rules</option>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <p className="text-sm text-gray-500">
            No automation logs yet. Logs appear here when rules fire.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Rule</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Conversation</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Result</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((log) => {
                const contact = log.conversations?.contacts;
                const contactLabel = contact?.name ?? contact?.phone ?? log.conversation_id.slice(0, 8);
                const isExpanded = expanded === log.id;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-900">
                      {log.rule_name ?? (
                        <span className="italic text-gray-500">
                          Template Auto-response
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/inbox?conversation=${log.conversation_id}`}
                        className="text-xs text-[#25D366] hover:underline"
                      >
                        {contactLabel}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {log.result === 'success' ? (
                        <span className="text-xs text-green-700 font-medium">
                          ✅ Success
                        </span>
                      ) : (
                        <span className="text-xs text-red-700 font-medium">
                          ❌ Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[240px]">
                      {log.error_message ? (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : log.id)}
                          className="text-left hover:text-gray-800"
                        >
                          {isExpanded ? log.error_message : truncate(log.error_message, 40)}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visibleCount < logs.length && (
            <div className="p-4 border-t border-gray-100 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + 50)}
                className="text-xs font-medium text-[#25D366] hover:underline"
              >
                Load more ({logs.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n) + '…';
}
