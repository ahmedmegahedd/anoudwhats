'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useAgents } from '@/hooks/useAgents';
import Avatar from '@/components/ui/Avatar';
import { PIPELINE_STAGES } from './shared';
import type { Contact } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ContactSearchResult {
  id: string;
  name: string | null;
  phone: string;
  company: string | null;
}

interface Props {
  initialStage?: string;
  onClose: () => void;
  onSaved: () => void;
  onCreateNewContact?: () => void;
}

export default function AddDealModal({
  initialStage,
  onClose,
  onSaved,
  onCreateNewContact,
}: Props) {
  const toast = useToast();
  const { agents } = useAgents();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactSearchResult | null>(
    null,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stage, setStage] = useState(initialStage ?? 'Lead');
  const [dealValue, setDealValue] = useState('');
  const [agentId, setAgentId] = useState('');
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (selectedContact) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/contacts?search=${encodeURIComponent(q)}&limit=10`,
        );
        if (!res.ok) return;
        const body = (await res.json()) as { data: ContactSearchResult[] };
        setSearchResults(body.data);
        setDropdownOpen(true);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selectedContact]);

  function pickContact(c: ContactSearchResult) {
    setSelectedContact(c);
    setSearch(c.name ?? c.phone);
    setDropdownOpen(false);
  }

  function clearContact() {
    setSelectedContact(null);
    setSearch('');
  }

  async function save() {
    if (!selectedContact) {
      toast('Select a contact', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        pipeline_stage: stage,
      };
      if (dealValue) payload.deal_value = Number(dealValue);
      if (agentId) payload.assigned_agent_id = agentId;

      const res = await apiFetch(`${API_URL}/pipeline/${selectedContact.id}/deal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Deal saved', 'success');
      onSaved();
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Add Deal</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Contact search */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Contact <span className="text-red-500">*</span>
            </label>
            {selectedContact ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Avatar name={selectedContact.name ?? selectedContact.phone} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedContact.name ?? 'Unknown'}
                  </p>
                  <p className="text-[11px] text-gray-500">{selectedContact.phone}</p>
                </div>
                <button
                  onClick={clearContact}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Type to search by name or phone…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                />
                {dropdownOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-400 italic">
                        No contacts match
                      </p>
                    ) : (
                      searchResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => pickContact(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <Avatar name={c.name ?? c.phone} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {c.name ?? 'Unknown'}
                            </p>
                            <p className="text-[11px] text-gray-500">{c.phone}</p>
                          </div>
                        </button>
                      ))
                    )}
                    {onCreateNewContact && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onCreateNewContact();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-[#25D366] hover:bg-green-50 border-t border-gray-100"
                      >
                        + Create New Contact
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stage */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Pipeline Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deal value */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Deal Value (EGP)
            </label>
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>

          {/* Agent */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Assigned Agent
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">— Unassigned —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !selectedContact}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}
