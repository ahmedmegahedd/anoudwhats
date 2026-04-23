'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import TriggerStep from './TriggerStep';
import ConditionsStep from './ConditionsStep';
import ActionsStep from './ActionsStep';
import type {
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  AutomationTriggerType,
} from '@anoud-job/types';

const API_URL = '/api';

interface Props {
  rule: AutomationRule | null;
  onClose: () => void;
  onSaved: (rule: AutomationRule, mode: 'create' | 'edit') => void;
}

type Step = 1 | 2 | 3;

export default function RuleBuilderModal({ rule, onClose, onSaved }: Props) {
  const toast = useToast();
  const isEdit = !!rule;

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(rule?.name ?? '');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType | null>(
    rule?.trigger_type ?? null,
  );
  const [keyword, setKeyword] = useState<string>(
    (rule?.trigger_config?.keyword as string | undefined) ?? '',
  );
  const [conditions, setConditions] = useState<AutomationCondition[]>(
    rule?.conditions ?? [],
  );
  const [actions, setActions] = useState<AutomationAction[]>(rule?.actions ?? []);
  const [saving, setSaving] = useState(false);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function next() {
    if (step === 1) {
      if (!triggerType) {
        toast('Select a trigger to continue', 'error');
        return;
      }
      if (triggerType === 'keyword_match' && !keyword.trim()) {
        toast('Enter a keyword for the trigger', 'error');
        return;
      }
    }
    setStep((s) => (Math.min(3, s + 1) as Step));
  }

  function back() {
    setStep((s) => (Math.max(1, s - 1) as Step));
  }

  async function save() {
    if (!name.trim()) {
      toast('Rule name is required', 'error');
      return;
    }
    if (!triggerType) {
      toast('Select a trigger', 'error');
      setStep(1);
      return;
    }
    if (actions.length === 0) {
      toast('Add at least one action', 'error');
      setStep(3);
      return;
    }

    const trigger_config =
      triggerType === 'keyword_match' ? { keyword: keyword.trim() } : {};

    const payload = {
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config,
      conditions,
      actions,
      is_active: rule?.is_active ?? true,
    };

    setSaving(true);
    try {
      const url = isEdit
        ? `${API_URL}/automation/rules/${rule!.id}`
        : `${API_URL}/automation/rules`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Save failed');
      }
      const saved = (await res.json()) as AutomationRule;
      toast(isEdit ? 'Rule updated' : 'Rule created', 'success');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Edit Rule' : 'New Automation Rule'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    s <= step
                      ? 'bg-[#25D366] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                <span
                  className={`text-xs font-medium ${
                    s <= step ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {s === 1 ? 'Trigger' : s === 2 ? 'Conditions' : 'Actions'}
                </span>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      s < step ? 'bg-[#25D366]' : 'bg-gray-100'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <TriggerStep
              value={triggerType}
              keyword={keyword}
              onChange={setTriggerType}
              onKeywordChange={setKeyword}
            />
          )}
          {step === 2 && (
            <ConditionsStep conditions={conditions} onChange={setConditions} />
          )}
          {step === 3 && (
            <ActionsStep actions={actions} onChange={setActions} />
          )}
        </div>

        {/* Footer: name + nav */}
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-6 py-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auto-reply to price inquiries"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>
          <div className="flex items-center justify-between px-6 pb-4">
            <button
              type="button"
              onClick={back}
              disabled={step === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Rule'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
