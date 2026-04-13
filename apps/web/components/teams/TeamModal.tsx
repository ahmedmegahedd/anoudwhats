'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { TeamWithCount } from '@/lib/types';

const COLOR_SWATCHES = [
  '#25D366',
  '#128C7E',
  '#075E54',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#6B7280',
];

interface TeamModalProps {
  team?: TeamWithCount; // undefined = create mode
  onClose: () => void;
  onSaved: () => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
  color: string;
}

export default function TeamModal({ team, onClose, onSaved }: TeamModalProps) {
  const isEdit = !!team;
  const [form, setForm] = useState<FormState>({
    name: team?.name ?? '',
    description: team?.description ?? '',
    color: team?.color ?? '#25D366',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Team name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
      };

      if (isEdit) {
        await api.patch(`/teams/${team!.id}`, payload);
        toast('Team updated');
      } else {
        await api.post('/teams', payload);
        toast('Team created');
      }

      await onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save team', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Team' : 'New Team'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Sales Team"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Team Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  title={c}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    form.color === c
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Preview */}
              <div className="ml-2 flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: form.color }}
                />
                <span className="text-xs text-gray-500 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );
}
