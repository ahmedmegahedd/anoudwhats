'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { ReadyDoc } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props {
  doc: ReadyDoc | null;
  categories: string[];
  onClose: () => void;
  onSaved: (doc: ReadyDoc, mode: 'create' | 'edit') => void;
}

type Tab = 'edit' | 'preview';

export default function DocModal({ doc, categories, onClose, onSaved }: Props) {
  const toast = useToast();
  const isEdit = !!doc;

  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState(doc?.category ?? '');
  const [language, setLanguage] = useState<'en' | 'ar'>(
    (doc?.language as 'en' | 'ar') ?? 'en',
  );
  const [content, setContent] = useState(doc?.content ?? '');
  const [tab, setTab] = useState<Tab>('edit');
  const [saving, setSaving] = useState(false);

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

    setSaving(true);
    try {
      const url = isEdit
        ? `${API_URL}/ready-docs/${doc!.id}`
        : `${API_URL}/ready-docs`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content,
          category: category.trim() || undefined,
          language,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = (await res.json()) as ReadyDoc;
      toast(isEdit ? 'Document updated' : 'Document created', 'success');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Document' : 'New Document'}
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
              placeholder="e.g. Welcome Message"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </Field>

          {/* Category + Language */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="doc-category-suggestions"
                placeholder="Greeting / Pricing / Support…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
              <datalist id="doc-category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Language">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    language === 'en'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  🇺🇸 EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    language === 'ar'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  🇪🇬 AR
                </button>
              </div>
            </Field>
          </div>

          {/* Content tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-600">
                Content <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setTab('edit')}
                  className={`px-3 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    tab === 'edit' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setTab('preview')}
                  className={`px-3 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    tab === 'preview' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>
            {tab === 'edit' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Write your document content…"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-y min-h-[9rem]"
              />
            ) : (
              <div className="min-h-[9rem] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 whitespace-pre-wrap leading-relaxed">
                {content || (
                  <span className="italic text-gray-400">Nothing to preview</span>
                )}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              {content.length} characters
            </p>
          </div>
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Document'}
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
