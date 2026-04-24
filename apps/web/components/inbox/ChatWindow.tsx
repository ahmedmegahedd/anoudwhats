'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/useAuth';
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox';
import { formatHHMM, initials } from '@/lib/format';
import SendWaTemplateModal from '@/components/templates/SendWaTemplateModal';
import { extractBodyText } from '@/components/templates/WaTemplatesTab';
import type { Message, Profile, InternalTemplate, WaTemplate } from '@anoud-job/types';

const API_URL = '/api';

interface ContactInfo {
  id: string;
  name: string | null;
  phone: string;
}

interface ConversationInfo {
  id: string;
  status: string;
  assigned_agent_id: string | null;
  contact: ContactInfo;
}

interface ChatWindowProps {
  conversationId: string;
  onBack: () => void;
}

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const currentAgentId = profile?.id ?? null;
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assign dropdown
  const [showAssign, setShowAssign] = useState(false);
  const [agents, setAgents] = useState<Profile[]>([]);

  // Template modal
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<InternalTemplate[]>([]);
  const [waTemplates, setWaTemplates] = useState<WaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [sendWaTemplate, setSendWaTemplate] = useState<WaTemplate | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch conversation + messages ────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const fetchAll = useCallback(async () => {
    try {
      const [convRes, msgsRes] = await Promise.all([
        apiFetch(`${API_URL}/conversations/${conversationId}`),
        apiFetch(`${API_URL}/conversations/${conversationId}/messages`),
      ]);

      if (convRes.ok) {
        const conv = (await convRes.json()) as ConversationInfo;
        setConversation(conv);
      } else {
        setConversation(null);
      }

      if (msgsRes.ok) {
        const msgs = (await msgsRes.json()) as Message[];
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversation', err);
      setConversation(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // ── Auto-scroll on new messages ──────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Realtime: new + updated messages ────────────────────────────────────
  useRealtimeInbox({
    conversationId,
    onNewMessage: (msg: Message) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        if (exists) {
          return prev.map((m) => (m.id === msg.id ? msg : m));
        }
        return [...prev, msg];
      });
    },
  });

  // ── Send message ─────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await apiFetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          type: 'text',
          content: text,
          sentBy: currentAgentId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInput('');
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  async function handleFilePick(file: File) {
    if (!currentAgentId || uploading) return;
    if (file.size > 16 * 1024 * 1024) {
      toast('File exceeds 16MB limit', 'error');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('conversationId', conversationId);
      form.append('sentBy', currentAgentId);
      form.append('file', file);
      if (input.trim()) form.append('caption', input.trim());
      const res = await apiFetch(`${API_URL}/messages/send-media`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      setInput('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Assign conversation ──────────────────────────────────────────────────
  async function openAssignDropdown() {
    if (agents.length === 0) {
      try {
        const res = await apiFetch(`${API_URL}/agents`);
        if (res.ok) {
          const list = (await res.json()) as Profile[];
          setAgents(list ?? []);
        }
      } catch (err) {
        console.error('Failed to load agents', err);
      }
    }
    setShowAssign(true);
  }

  async function assignTo(agentId: string) {
    setShowAssign(false);
    await apiFetch(`${API_URL}/conversations/${conversationId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    setConversation((prev) =>
      prev ? { ...prev, status: 'assigned', assigned_agent_id: agentId } : prev,
    );
  }

  // ── Resolve conversation ─────────────────────────────────────────────────
  async function resolve() {
    await apiFetch(`${API_URL}/conversations/${conversationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    setConversation((prev) => (prev ? { ...prev, status: 'resolved' } : prev));
  }

  // ── Template picker ──────────────────────────────────────────────────────
  async function openTemplates() {
    setShowTemplates(true);
    if (templates.length === 0 && waTemplates.length === 0) {
      setTemplatesLoading(true);
      try {
        const [internalRes, waRes] = await Promise.all([
          apiFetch(`${API_URL}/templates/internal?is_auto=false`),
          apiFetch(`${API_URL}/templates/wa?status=APPROVED`),
        ]);
        if (internalRes.ok) {
          setTemplates((await internalRes.json()) as InternalTemplate[]);
        }
        if (waRes.ok) {
          setWaTemplates((await waRes.json()) as WaTemplate[]);
        }
      } catch (err) {
        console.error('Failed to load templates', err);
      } finally {
        setTemplatesLoading(false);
      }
    }
  }

  function applyTemplate(content: string) {
    setInput(content);
    setShowTemplates(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <ChatWindowSkeleton />;
  if (!conversation) return null;

  const contact = conversation.contact;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white z-10">
        <button
          onClick={onBack}
          className="md:hidden p-1 rounded hover:bg-gray-100 text-gray-500"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {initials(contact?.name ?? contact?.phone)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {contact?.name ?? contact?.phone ?? 'Unknown'}
          </p>
          {contact?.name && (
            <p className="text-xs text-gray-500">{contact.phone}</p>
          )}
        </div>

        <StatusPill status={conversation.status} />

        <div className="relative">
          <button
            onClick={openAssignDropdown}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Assign
          </button>
          {showAssign && (
            <AssignDropdown
              agents={agents}
              onSelect={assignTo}
              onClose={() => setShowAssign(false)}
            />
          )}
        </div>

        {conversation.status !== 'resolved' && (
          <button
            onClick={resolve}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            Resolve
          </button>
        )}
      </div>

      {/* ── Message thread ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ backgroundColor: '#ECE5DD' }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 bg-white rounded-lg px-4 py-2 shadow-sm">
              No messages yet. Send the first one!
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-white px-3 py-3">
        <div className="flex items-end gap-2">
          <button
            onClick={openTemplates}
            title="Quick reply templates"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors font-bold text-sm"
          >
            T
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !currentAgentId}
            title="Attach file"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Attach file"
          >
            {uploading ? (
              <span className="text-xs">…</span>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 10-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePick(f);
            }}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Ctrl+Enter to send)"
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#25D366] max-h-28 overflow-y-auto"
            style={{ lineHeight: '1.4' }}
          />

          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] disabled:opacity-40 transition-colors"
            aria-label="Send"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Template modal ────────────────────────────────────────────── */}
      {showTemplates && (
        <TemplateModal
          templates={templates}
          waTemplates={waTemplates}
          loading={templatesLoading}
          onSelectQuick={applyTemplate}
          onSelectWa={(t) => {
            setShowTemplates(false);
            setSendWaTemplate(t);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* ── Send WA template sub-modal ────────────────────────────────── */}
      {sendWaTemplate && currentAgentId && (
        <SendWaTemplateModal
          template={sendWaTemplate}
          conversationId={conversationId}
          sentBy={currentAgentId}
          onClose={() => setSendWaTemplate(null)}
          onSent={() => setSendWaTemplate(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-2xl shadow-sm ${
          isOutbound
            ? 'bg-[#DCF8C6] rounded-br-sm'
            : 'bg-white rounded-bl-sm border border-gray-100'
        }`}
      >
        {message.type === 'text' ? (
          <p className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        ) : message.type === 'image' && message.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.media_url}
            alt="image"
            className="max-w-full rounded-lg"
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📎</span>
            <span className="capitalize">{message.type}</span>
          </div>
        )}

        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-gray-400">{formatHHMM(message.created_at)}</span>
          {isOutbound && <StatusTick status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: string | null }) {
  if (status === 'read') {
    return <span className="text-[10px] text-blue-500">✓✓</span>;
  }
  if (status === 'delivered') {
    return <span className="text-[10px] text-gray-500">✓✓</span>;
  }
  return <span className="text-[10px] text-gray-400">✓</span>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    assigned: 'bg-blue-100 text-blue-700',
    resolved: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${
        map[status] ?? 'bg-gray-100 text-gray-500'
      }`}
    >
      {status}
    </span>
  );
}

function AssignDropdown({
  agents,
  onSelect,
  onClose,
}: {
  agents: Profile[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-9 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
        {agents.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-400">No agents found</p>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white font-medium">
                {initials(agent.full_name)}
              </div>
              <span className="truncate">{agent.full_name}</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

function TemplateModal({
  templates,
  waTemplates,
  loading,
  onSelectQuick,
  onSelectWa,
  onClose,
}: {
  templates: InternalTemplate[];
  waTemplates: WaTemplate[];
  loading: boolean;
  onSelectQuick: (content: string) => void;
  onSelectWa: (template: WaTemplate) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'quick' | 'wa'>('quick');
  const [search, setSearch] = useState('');

  const filteredQuick = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
    );
  });

  const filteredWa = waTemplates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const body = extractBodyText(t.components).toLowerCase();
    return t.name.toLowerCase().includes(q) || body.includes(q);
  });

  return (
    <div className="absolute inset-0 z-30 flex items-end md:items-center justify-center bg-black/30">
      <div className="w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Templates</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('quick')}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'quick'
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Quick Replies
          </button>
          <button
            onClick={() => setTab('wa')}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'wa'
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            WA Templates
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">
              Loading templates…
            </div>
          ) : tab === 'quick' ? (
            filteredQuick.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-gray-400">
                No quick replies
              </div>
            ) : (
              filteredQuick.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectQuick(t.content)}
                  className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {t.content}
                  </p>
                  {t.category && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {t.category}
                    </span>
                  )}
                </button>
              ))
            )
          ) : filteredWa.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">
              No approved WA templates
            </div>
          ) : (
            filteredWa.map((t) => {
              const body = extractBodyText(t.components);
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectWa(t)}
                  className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-mono font-semibold text-gray-800">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {body || 'No body text'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {t.language && (
                      <span className="text-[10px] text-gray-400 uppercase">
                        {t.language}
                      </span>
                    )}
                    {t.category && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        {t.category}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ChatWindowSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <div className="w-9 h-9 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-32 mb-1.5" />
          <div className="h-2 bg-gray-200 rounded w-24" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3" style={{ backgroundColor: '#ECE5DD' }}>
        {[70, 50, 80, 60].map((w, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div
              className="h-10 bg-white rounded-2xl"
              style={{ width: `${w}%`, opacity: 0.6 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
