'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useAgents } from '@/hooks/useAgents';
import { useCampaigns } from '@/hooks/useCampaigns';
import { PIPELINE_STAGES, tagColor } from './shared';
import type { Contact } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props {
  contact: Contact | null;
  knownChannels: string[];
  knownSources: string[];
  onClose: () => void;
  onSaved: (contact: Contact, mode: 'create' | 'edit') => void;
}

export default function ContactModal({
  contact,
  knownChannels,
  knownSources,
  onClose,
  onSaved,
}: Props) {
  const toast = useToast();
  const { agents } = useAgents();
  const { campaigns } = useCampaigns();
  const isEdit = !!contact;

  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [channel, setChannel] = useState(contact?.channel ?? '');
  const [channelOther, setChannelOther] = useState('');
  const [source, setSource] = useState(contact?.source ?? '');
  const [sourceOther, setSourceOther] = useState('');
  const [campaignId, setCampaignId] = useState(contact?.campaign_id ?? '');
  const [stage, setStage] = useState(contact?.pipeline_stage ?? 'Lead');
  const [dealValue, setDealValue] = useState<string>(
    contact?.deal_value !== null && contact?.deal_value !== undefined
      ? String(contact.deal_value)
      : '',
  );
  const [agentId, setAgentId] = useState(contact?.assigned_agent_id ?? '');
  const [tags, setTags] = useState<string[]>(contact?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const channelIsOther =
    !!channel && channel === '__other__';
  const sourceIsOther = !!source && source === '__other__';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function addTag() {
    const clean = tagInput.trim();
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }
    setTags([...tags, clean]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function save() {
    if (!phone.trim()) {
      toast('Phone is required', 'error');
      return;
    }
    const phonePattern = /^\+?\d[\d\s-]{5,}$/;
    if (!phonePattern.test(phone.trim())) {
      toast('Phone must start with + or digits', 'error');
      return;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast('Invalid email', 'error');
      return;
    }

    const finalChannel = channelIsOther
      ? channelOther.trim() || undefined
      : channel || undefined;
    const finalSource = sourceIsOther
      ? sourceOther.trim() || undefined
      : source || undefined;

    const payload: Record<string, unknown> = {
      phone: phone.trim(),
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      channel: finalChannel,
      source: finalSource,
      campaign_id: campaignId || undefined,
      pipeline_stage: stage,
      deal_value: dealValue ? Number(dealValue) : undefined,
      assigned_agent_id: agentId || undefined,
      tags,
    };

    setSaving(true);
    try {
      const url = isEdit
        ? `${API_URL}/contacts/${contact!.id}`
        : `${API_URL}/contacts`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = (await res.json()) as Contact;
      toast(isEdit ? 'Contact updated' : 'Contact created', 'success');
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
            {isEdit ? 'Edit Contact' : 'New Contact'}
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
          {/* Name + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Full Name">
              <Input value={name} onChange={setName} placeholder="Ahmed Ali" />
            </Field>
            <Field label="Phone" required>
              <Input value={phone} onChange={setPhone} placeholder="+201012345678" />
            </Field>
          </div>

          {/* Email + Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Email">
              <Input value={email} onChange={setEmail} placeholder="user@example.com" />
            </Field>
            <Field label="Company">
              <Input value={company} onChange={setCompany} placeholder="Acme Inc." />
            </Field>
          </div>

          {/* Channel + Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Channel">
              <Select
                value={channel}
                onChange={setChannel}
                options={[
                  { value: '', label: '— None —' },
                  ...knownChannels.map((c) => ({ value: c, label: c })),
                  { value: '__other__', label: 'Other…' },
                ]}
              />
              {channelIsOther && (
                <Input
                  value={channelOther}
                  onChange={setChannelOther}
                  placeholder="Enter channel name"
                  className="mt-2"
                />
              )}
            </Field>
            <Field label="Source">
              <Select
                value={source}
                onChange={setSource}
                options={[
                  { value: '', label: '— None —' },
                  ...knownSources.map((s) => ({ value: s, label: s })),
                  { value: '__other__', label: 'Other…' },
                ]}
              />
              {sourceIsOther && (
                <Input
                  value={sourceOther}
                  onChange={setSourceOther}
                  placeholder="Enter source name"
                  className="mt-2"
                />
              )}
            </Field>
          </div>

          {/* Campaign + Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Campaign">
              <Select
                value={campaignId}
                onChange={setCampaignId}
                options={[
                  { value: '', label: '— None —' },
                  ...campaigns.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </Field>
            <Field label="Pipeline Stage">
              <Select
                value={stage}
                onChange={setStage}
                options={PIPELINE_STAGES.map((s) => ({ value: s, label: s }))}
              />
            </Field>
          </div>

          {/* Deal value + Agent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Deal Value (EGP)">
              <Input
                value={dealValue}
                onChange={setDealValue}
                placeholder="0"
                type="number"
              />
            </Field>
            <Field label="Assigned Agent">
              <Select
                value={agentId}
                onChange={setAgentId}
                options={[
                  { value: '', label: '— Unassigned —' },
                  ...agents.map((a) => ({ value: a.id, label: a.full_name })),
                ]}
              />
            </Field>
          </div>

          {/* Tags */}
          <Field label="Tags">
            <div className="flex flex-wrap items-center gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[38px] focus-within:ring-2 focus-within:ring-[#25D366]">
              {tags.map((t) => (
                <span
                  key={t}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColor(t)}`}
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={tags.length === 0 ? 'Type and press Enter…' : ''}
                className="flex-1 min-w-[100px] text-xs bg-transparent border-none outline-none"
              />
            </div>
          </Field>
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Contact'}
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

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] ${className}`}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
