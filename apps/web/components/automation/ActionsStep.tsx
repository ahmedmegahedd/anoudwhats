'use client';

import { useAgents } from '@/hooks/useAgents';
import { useTeams } from '@/hooks/useTeams';
import { useWaTemplates } from '@/hooks/useWaTemplates';
import type { AutomationAction, AutomationActionType } from '@anoud-job/types';

const ACTION_TYPES: { value: AutomationActionType; label: string; icon: string }[] = [
  { value: 'send_message', label: 'Send Message', icon: '💬' },
  { value: 'assign_agent', label: 'Assign to Agent', icon: '👤' },
  { value: 'assign_team', label: 'Assign to Team', icon: '👥' },
  { value: 'add_tag', label: 'Add Tag', icon: '🏷️' },
  { value: 'change_stage', label: 'Change Pipeline Stage', icon: '📊' },
  { value: 'send_wa_template', label: 'Send WA Template', icon: '📋' },
];

const PIPELINE_STAGES = [
  'Lead',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
];

interface Props {
  actions: AutomationAction[];
  onChange: (actions: AutomationAction[]) => void;
}

export default function ActionsStep({ actions, onChange }: Props) {
  const { agents, loading: agentsLoading } = useAgents();
  const { teams, loading: teamsLoading } = useTeams();
  const { templates, loading: templatesLoading } = useWaTemplates();

  function add() {
    onChange([...actions, { type: 'send_message', config: {} }]);
  }

  function update(index: number, patch: Partial<AutomationAction>) {
    const next = actions.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  }

  function updateConfig(index: number, configPatch: Partial<AutomationAction['config']>) {
    const next = actions.map((a, i) =>
      i === index ? { ...a, config: { ...a.config, ...configPatch } } : a,
    );
    onChange(next);
  }

  function remove(index: number) {
    onChange(actions.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Then do this…</h2>
      <p className="text-sm text-gray-500 mb-5">
        Actions run in order, top to bottom
      </p>

      {actions.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl mb-4">
          <p className="text-sm text-gray-400">
            No actions yet — click &apos;+ Add Action&apos; to define what happens
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {actions.map((action, i) => (
            <div
              key={i}
              className="p-4 bg-white border border-gray-200 rounded-xl"
            >
              <div className="flex items-start gap-2">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === actions.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  {/* Action type */}
                  <select
                    value={action.type}
                    onChange={(e) =>
                      update(i, {
                        type: e.target.value as AutomationActionType,
                        config: {},
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.icon} {a.label}
                      </option>
                    ))}
                  </select>

                  {/* Config fields per type */}
                  {action.type === 'send_message' && (
                    <textarea
                      value={action.config.message ?? ''}
                      onChange={(e) => updateConfig(i, { message: e.target.value })}
                      rows={3}
                      placeholder="Message content…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-y"
                    />
                  )}

                  {action.type === 'assign_agent' && (
                    <select
                      value={action.config.agentId ?? ''}
                      onChange={(e) => updateConfig(i, { agentId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    >
                      <option value="">
                        {agentsLoading ? 'Loading…' : 'Select agent…'}
                      </option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                  )}

                  {action.type === 'assign_team' && (
                    <select
                      value={action.config.teamId ?? ''}
                      onChange={(e) => updateConfig(i, { teamId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    >
                      <option value="">
                        {teamsLoading ? 'Loading…' : 'Select team…'}
                      </option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {action.type === 'add_tag' && (
                    <input
                      type="text"
                      value={action.config.tag ?? ''}
                      onChange={(e) => updateConfig(i, { tag: e.target.value })}
                      placeholder="Tag name (e.g. vip, hot-lead)"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  )}

                  {action.type === 'change_stage' && (
                    <select
                      value={action.config.stage ?? ''}
                      onChange={(e) => updateConfig(i, { stage: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    >
                      <option value="">Select stage…</option>
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}

                  {action.type === 'send_wa_template' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        value={action.config.templateName ?? ''}
                        onChange={(e) => {
                          const tpl = templates.find((t) => t.name === e.target.value);
                          updateConfig(i, {
                            templateName: e.target.value,
                            templateLanguage:
                              tpl?.language ?? action.config.templateLanguage ?? 'en',
                          });
                        }}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      >
                        <option value="">
                          {templatesLoading ? 'Loading…' : 'Select template…'}
                        </option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={action.config.templateLanguage ?? 'en'}
                        onChange={(e) =>
                          updateConfig(i, { templateLanguage: e.target.value })
                        }
                        placeholder="Language (e.g. en)"
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      />
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="px-4 py-2 text-sm font-medium text-[#25D366] bg-white border border-[#25D366] rounded-lg hover:bg-green-50 transition-colors"
      >
        + Add Action
      </button>
    </div>
  );
}
