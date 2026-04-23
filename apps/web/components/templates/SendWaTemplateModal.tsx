'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { extractBodyText } from './WaTemplatesTab';
import type { WaTemplate } from '@anoud-job/types';

const API_URL = '/api';

interface Props {
  template: WaTemplate;
  conversationId: string;
  sentBy: string;
  onClose: () => void;
  onSent: () => void;
}

const VAR_REGEX = /\{\{(\d+)\}\}/g;

export default function SendWaTemplateModal({
  template,
  conversationId,
  sentBy,
  onClose,
  onSent,
}: Props) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const bodyText = useMemo(() => extractBodyText(template.components), [template]);

  // Detect variable indices from body
  const variableIndices = useMemo(() => {
    const set = new Set<string>();
    let match;
    const re = new RegExp(VAR_REGEX);
    while ((match = re.exec(bodyText)) !== null) {
      set.add(match[1]);
    }
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [bodyText]);

  const [values, setValues] = useState<Record<string, string>>({});

  // Reset when template changes
  useEffect(() => {
    setValues({});
  }, [template.id]);

  const preview = useMemo(() => {
    return bodyText.replace(VAR_REGEX, (_, i) => values[i] ?? `{{${i}}}`);
  }, [bodyText, values]);

  async function send() {
    // Build template components array
    const components =
      variableIndices.length > 0
        ? [
            {
              type: 'body',
              parameters: variableIndices.map((i) => ({
                type: 'text',
                text: values[i] ?? '',
              })),
            },
          ]
        : [];

    setSending(true);
    try {
      const res = await apiFetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          type: 'template',
          templateName: template.name,
          templateLanguage: template.language ?? 'en',
          templateComponents: components,
          sentBy,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Send failed');
      }
      toast('Template sent', 'success');
      onSent();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Send Template</h3>
            <p className="text-[11px] font-mono text-gray-500 mt-0.5">{template.name}</p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Body text */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Template Body
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {bodyText || (
                <span className="italic text-gray-400">No body text</span>
              )}
            </div>
          </div>

          {/* Variable inputs */}
          {variableIndices.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-600">Fill in variables:</p>
              {variableIndices.map((i) => (
                <div key={i}>
                  <label className="block text-[11px] text-gray-500 mb-1 font-mono">
                    {'{{'}
                    {i}
                    {'}}'}
                  </label>
                  <input
                    type="text"
                    value={values[i] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [i]: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Preview
            </label>
            <div className="p-3 bg-[#DCF8C6] border border-green-200 rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {preview || <span className="italic text-gray-400">Empty</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors"
          >
            {sending ? 'Sending…' : 'Send Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
