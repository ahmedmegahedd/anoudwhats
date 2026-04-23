'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { InternalTemplate } from '@anoud-job/types';

const API_URL = '/api';

const CATEGORY_SUGGESTIONS = [
  'Greeting',
  'Pricing',
  'After-sales',
  'Complaint',
  'Support',
  'Other',
];

type TriggerType = 'first_message' | 'outside_hours' | 'keyword' | 'always';

interface TriggerRule {
  type: TriggerType;
  keyword?: string;
}

interface Props {
  template: InternalTemplate | null;
  onClose: () => void;
  onSaved: (template: InternalTemplate, mode: 'create' | 'edit') => void;
}

export default function InternalTemplateModal({ template, onClose, onSaved }: Props) {
  const toast = useToast();
  const isEdit = !!template;

  const [title, setTitle] = useState(template?.title ?? '');
  const [category, setCategory] = useState(template?.category ?? '');
  const [language, setLanguage] = useState<'en' | 'ar'>(
    (template?.language as 'en' | 'ar') ?? 'en',
  );
  const [content, setContent] = useState(template?.content ?? '');
  const [isAuto, setIsAuto] = useState(template?.is_auto ?? false);

  const initialRule = (template?.trigger_rule as TriggerRule | null) ?? null;
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initialRule?.type ?? 'first_message',
  );
  const [keyword, setKeyword] = useState(initialRule?.keyword ?? '');
  const [saving, setSaving] = useState(false);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function save() {
    if (!title.trim()) {
      toast('Title is required', 'error');
      return;
    }
    if (!content.trim()) {
      toast('Content is required', 'error');
      return;
    }

    const trigger_rule: TriggerRule | null = isAuto
      ? triggerType === 'keyword'
        ? { type: 'keyword', keyword: keyword.trim() }
        : { type: triggerType }
      : null;

    const payload = {
      title: title.trim(),
      content,
      category: category.trim() || undefined,
      language,
      is_auto: isAuto,
      trigger_rule: trigger_rule ?? undefined,
    };

    setSaving(true);
    try {
      const url = isEdit
        ? `${API_URL}/templates/internal/${template!.id}`
        : `${API_URL}/templates/internal`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Save failed');
      }
      const saved = (await res.json()) as InternalTemplate;
      toast(isEdit ? 'Template updated' : 'Template created', 'success');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Template' : 'New Template'}
          </h3>
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Welcome message"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </Field>

          {/* Category */}
          <Field label="Category">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Greeting / Pricing / Support…"
              list="category-suggestions"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          {/* Language */}
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </Field>

          {/* Content */}
          <Field label="Content" required>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Write your message…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-y min-h-[6rem]"
            />
            <p className="text-[11px] text-gray-400 mt-1">{content.length} characters</p>
          </Field>

          {/* Auto toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Auto-response</p>
              <p className="text-[11px] text-gray-500">
                Fire automatically on incoming messages
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAuto((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAuto ? 'bg-[#25D366]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAuto ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Trigger rule */}
          {isAuto && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-green-800">Trigger Rule</p>
              <Field label="Trigger Type">
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as TriggerType)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
                >
                  <option value="first_message">First message received</option>
                  <option value="outside_hours">Outside business hours</option>
                  <option value="keyword">Message contains keyword</option>
                  <option value="always">Always (every message)</option>
                </select>
              </Field>
              {triggerType === 'keyword' && (
                <Field label="Keyword to match">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. price"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                </Field>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
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
