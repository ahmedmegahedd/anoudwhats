'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAgents } from '@/hooks/useAgents';
import {
  PIPELINE_STAGES,
  channelClass,
  formatEGP,
  relativeTime,
  stageClass,
  tagColor,
} from './shared';
import type { Contact } from '@anoud-job/types';

const API_URL = '/api';

interface Conversation {
  id: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
  message_count: number;
  last_message: { content: string | null; created_at: string } | null;
}

interface AttachmentSummary {
  id: string;
  file_name: string | null;
  file_type: string | null;
  media_url: string | null;
  created_at: string;
}

interface ContactDetail extends Contact {
  campaign: { id: string; name: string } | null;
  agent: { id: string; full_name: string; avatar_url: string | null } | null;
  conversations: Conversation[];
  attachments: { total: number; recent: AttachmentSummary[] };
}

interface Props {
  contactId: string;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onUpdated: (contact: Contact) => void;
}

export default function ContactDetailDrawer({
  contactId,
  onClose,
  onEdit,
  onUpdated,
}: Props) {
  const toast = useToast();
  const { agents } = useAgents();
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [editingDeal, setEditingDeal] = useState(false);
  const [dealInput, setDealInput] = useState('');
  const [openSections, setOpenSections] = useState({
    conversations: true,
    attachments: true,
    activity: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/contacts/${contactId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ContactDetail;
      setDetail(data);
      setDealInput(data.deal_value !== null ? String(data.deal_value) : '');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load contact', 'error');
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Field updates ─────────────────────────────────────────────────────
  async function patchContact(patch: Record<string, unknown>) {
    try {
      const res = await apiFetch(`${API_URL}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as Contact;
      onUpdated(updated);
      // Reload detail to refresh joined fields
      await load();
      toast('Updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  }

  async function changeStage(stage: string) {
    await patchContact({ pipeline_stage: stage });
  }

  async function changeAgent(agentId: string) {
    await patchContact({ assigned_agent_id: agentId || null });
  }

  async function saveDealValue() {
    const n = dealInput ? Number(dealInput) : null;
    if (dealInput && (Number.isNaN(n) || n === null)) {
      toast('Invalid number', 'error');
      return;
    }
    setEditingDeal(false);
    await patchContact({ deal_value: n });
  }

  // ── Tags ──────────────────────────────────────────────────────────────
  async function addTag() {
    const tag = newTag.trim();
    if (!tag) {
      setAddingTag(false);
      return;
    }
    try {
      const res = await apiFetch(`${API_URL}/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) throw new Error(await res.text());
      const tags = (await res.json()) as string[];
      if (detail) setDetail({ ...detail, tags });
      setNewTag('');
      setAddingTag(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add tag', 'error');
    }
  }

  async function removeTag(tag: string) {
    try {
      const res = await fetch(
        `${API_URL}/contacts/${contactId}/tags/${encodeURIComponent(tag)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(await res.text());
      const tags = (await res.json()) as string[];
      if (detail) setDetail({ ...detail, tags });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove tag', 'error');
    }
  }

  // ── Activity timeline ────────────────────────────────────────────────
  const activity = detail
    ? buildActivityEvents(detail).slice(0, 10)
    : [];

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col">
        {loading || !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Avatar name={detail.name ?? detail.phone} size="lg" />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {detail.name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">{detail.phone}</p>
                  <div className="mt-2">
                    <StagePicker
                      current={detail.pipeline_stage}
                      onChange={changeStage}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(detail)}
                  className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Contact Info */}
              <Section title="Contact Info">
                <InfoRow label="Name" value={detail.name ?? '—'} />
                <InfoRow label="Phone" value={detail.phone} />
                <InfoRow label="Email" value={detail.email ?? '—'} />
                <InfoRow label="Company" value={detail.company ?? '—'} />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-500">Channel</span>
                  {detail.channel ? (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelClass(detail.channel)}`}
                    >
                      {detail.channel}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
                <InfoRow label="Source" value={detail.source ?? '—'} />
                <InfoRow label="Campaign" value={detail.campaign?.name ?? '—'} />
                <InfoRow label="Created" value={relativeTime(detail.created_at)} />
                <InfoRow label="Last Seen" value={relativeTime(detail.last_seen_at)} />
              </Section>

              {/* Tags */}
              <Section title="Tags">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(detail.tags ?? []).map((t) => (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColor(t)}`}
                    >
                      {t}
                      <button
                        onClick={() => removeTag(t)}
                        className="hover:opacity-70"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {addingTag ? (
                    <input
                      autoFocus
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={addTag}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTag();
                        if (e.key === 'Escape') {
                          setAddingTag(false);
                          setNewTag('');
                        }
                      }}
                      placeholder="tag name"
                      className="text-[11px] px-2 py-0.5 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTag(true)}
                      className="text-[11px] text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-0.5 transition-colors"
                    >
                      + Add tag
                    </button>
                  )}
                </div>
              </Section>

              {/* Deal Info */}
              <Section title="Deal Info">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-500">Deal Value</span>
                  {editingDeal ? (
                    <input
                      autoFocus
                      type="number"
                      value={dealInput}
                      onChange={(e) => setDealInput(e.target.value)}
                      onBlur={saveDealValue}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveDealValue();
                        if (e.key === 'Escape') {
                          setEditingDeal(false);
                          setDealInput(
                            detail.deal_value !== null
                              ? String(detail.deal_value)
                              : '',
                          );
                        }
                      }}
                      className="w-28 px-2 py-1 text-xs text-right border border-gray-200 rounded outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingDeal(true)}
                      className="text-xs font-semibold text-gray-900 hover:text-[#25D366] transition-colors"
                    >
                      {formatEGP(detail.deal_value)}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-500">Assigned Agent</span>
                  <select
                    value={detail.assigned_agent_id ?? ''}
                    onChange={(e) => changeAgent(e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  >
                    <option value="">— Unassigned —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </Section>

              {/* Conversations */}
              <CollapsibleSection
                title={`Conversations (${detail.conversations.length})`}
                open={openSections.conversations}
                onToggle={() =>
                  setOpenSections((s) => ({ ...s, conversations: !s.conversations }))
                }
              >
                {detail.conversations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No conversations yet</p>
                ) : (
                  <div className="space-y-2">
                    {detail.conversations.map((c) => (
                      <a
                        key={c.id}
                        href={`/inbox?conversation=${c.id}`}
                        className="block p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${convStatusClass(c.status)}`}
                          >
                            {c.status}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {c.message_count} msgs
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 truncate">
                          {c.last_message?.content ?? 'No messages'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {relativeTime(c.last_message_at ?? c.created_at)}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Attachments */}
              <CollapsibleSection
                title={`Attachments (${detail.attachments.total})`}
                open={openSections.attachments}
                onToggle={() =>
                  setOpenSections((s) => ({ ...s, attachments: !s.attachments }))
                }
              >
                {detail.attachments.recent.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No attachments</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {detail.attachments.recent.map((a) => (
                        <div
                          key={a.id}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
                        >
                          {a.file_type === 'image' && a.media_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.media_url}
                              alt={a.file_name ?? ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">📄</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {detail.attachments.total > 3 && (
                      <a
                        href={`/attachments?contact_id=${detail.id}`}
                        className="text-xs text-[#25D366] hover:underline"
                      >
                        View all {detail.attachments.total} attachments →
                      </a>
                    )}
                  </>
                )}
              </CollapsibleSection>

              {/* Activity */}
              <CollapsibleSection
                title="Activity Timeline"
                open={openSections.activity}
                onToggle={() =>
                  setOpenSections((s) => ({ ...s, activity: !s.activity }))
                }
              >
                {activity.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {activity.map((event, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-700">{event.text}</p>
                          <p className="text-[10px] text-gray-400">
                            {relativeTime(event.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
          {title}
        </p>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-900 truncate max-w-[240px]">{value}</span>
    </div>
  );
}

function StagePicker({
  current,
  onChange,
}: {
  current: string;
  onChange: (stage: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageClass(current)}`}
      >
        {current}
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
            {PIPELINE_STAGES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setOpen(false);
                  onChange(s);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function convStatusClass(status: string): string {
  const map: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    assigned: 'bg-blue-100 text-blue-700',
    resolved: 'bg-gray-100 text-gray-500',
    archived: 'bg-gray-100 text-gray-400',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

// ── Activity timeline builder ───────────────────────────────────────────

interface ActivityEvent {
  at: string;
  text: string;
}

function buildActivityEvents(detail: ContactDetail): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Contact created
  events.push({
    at: detail.created_at,
    text: 'Contact created',
  });

  // Conversations opened
  for (const conv of detail.conversations) {
    events.push({
      at: conv.created_at,
      text: 'Conversation opened',
    });
    if (conv.last_message && conv.message_count > 0) {
      events.push({
        at: conv.last_message.created_at,
        text: `Message received (${conv.message_count} total)`,
      });
    }
  }

  // Sort desc
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
