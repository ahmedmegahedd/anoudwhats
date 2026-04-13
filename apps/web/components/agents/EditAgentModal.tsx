'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { AgentWithTeam, TeamBasic } from '@/lib/types';

interface EditAgentModalProps {
  agent: AgentWithTeam;
  teams: TeamBasic[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

interface FormState {
  full_name: string;
  role: 'admin' | 'agent';
  team_id: string; // empty string = no team
  max_chats: number;
}

export default function EditAgentModal({
  agent,
  teams,
  onClose,
  onSaved,
}: EditAgentModalProps) {
  const [form, setForm] = useState<FormState>({
    full_name: agent.full_name,
    role: agent.role,
    team_id: agent.team?.id ?? '',
    max_chats: agent.max_chats,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Escape key
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
    if (!form.full_name.trim()) {
      toast('Full name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/agents/${agent.id}`, {
        full_name: form.full_name.trim(),
        role: form.role,
        team_id: form.team_id || null,
        max_chats: form.max_chats,
      });
      toast('Agent updated successfully');
      await onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update agent', 'error');
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
          <h2 className="text-base font-semibold text-gray-900">Edit Agent</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              placeholder="Agent's full name"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value as 'admin' | 'agent')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Team
            </label>
            <select
              value={form.team_id}
              onChange={(e) => set('team_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
            >
              <option value="">No Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Max Chats */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Max Concurrent Chats
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.max_chats}
              onChange={(e) =>
                set('max_chats', Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <p className="mt-1 text-[11px] text-gray-400">Between 1 and 50</p>
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
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
