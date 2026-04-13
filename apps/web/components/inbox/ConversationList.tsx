'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox';
import { formatRelativeTime, initials } from '@/lib/format';
import type { Conversation } from '@anoud-job/types';

// TODO: replace with auth session (Part 10)
const CURRENT_AGENT_ID = '00000000-0000-0000-0000-000000000000';

type Tab = 'all' | 'mine' | 'unassigned' | 'resolved';

interface ConversationRow {
  id: string;
  status: string;
  last_message_at: string | null;
  assigned_agent_id: string | null;
  contact: { id: string; name: string | null; phone: string };
  lastMessage: {
    content: string | null;
    type: string;
    direction: string;
    created_at: string;
  } | null;
}

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  const fetchConversations = useCallback(async () => {
    const db = createClient();

    const { data: convs, error } = await db
      .from('conversations')
      .select('id, status, last_message_at, assigned_agent_id, contacts(id, name, phone)')
      .neq('status', 'archived')
      .order('last_message_at', { ascending: false });

    if (error || !convs) {
      setLoading(false);
      return;
    }

    // Fetch last message per conversation
    const ids = convs.map((c) => c.id);
    const { data: msgs } = await db
      .from('messages')
      .select('conversation_id, content, type, direction, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false });

    // Build last-message map (first seen per conv_id = most recent)
    const lastMsgMap: Record<string, ConversationRow['lastMessage']> = {};
    msgs?.forEach((m) => {
      if (!lastMsgMap[m.conversation_id]) {
        lastMsgMap[m.conversation_id] = {
          content: m.content,
          type: m.type,
          direction: m.direction,
          created_at: m.created_at,
        };
      }
    });

    setRows(
      convs.map((c) => ({
        id: c.id,
        status: c.status,
        last_message_at: c.last_message_at,
        assigned_agent_id: c.assigned_agent_id,
        contact: c.contacts as unknown as { id: string; name: string | null; phone: string },
        lastMessage: lastMsgMap[c.id] ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime: refresh when a conversation is updated or inserted
  useRealtimeInbox({
    conversationId: null,
    onConversationUpdate: (updated: Conversation) => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === updated.id);
        if (idx === -1) {
          // New conversation — refetch to get contact data
          fetchConversations();
          return prev;
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          status: updated.status,
          last_message_at: updated.last_message_at,
          assigned_agent_id: updated.assigned_agent_id,
        };
        // Re-sort by last_message_at
        return next.sort((a, b) => {
          if (!a.last_message_at) return 1;
          if (!b.last_message_at) return -1;
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        });
      });
    },
  });

  // Tab filtering
  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.contact?.phone?.includes(search);

    const matchTab =
      tab === 'all'
        ? r.status !== 'resolved'
        : tab === 'mine'
          ? r.assigned_agent_id === CURRENT_AGENT_ID
          : tab === 'unassigned'
            ? !r.assigned_agent_id && r.status === 'open'
            : r.status === 'resolved';

    return matchSearch && matchTab;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Mine' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="flex flex-col h-full w-full border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Inbox</h2>
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] placeholder:text-gray-400"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'text-[#25D366] border-b-2 border-[#25D366]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ConversationListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-400">
            <p>No conversations</p>
          </div>
        ) : (
          filtered.map((row) => (
            <ConversationCard
              key={row.id}
              row={row}
              isActive={row.id === selectedId}
              onClick={() => onSelect(row.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationCard({
  row,
  isActive,
  onClick,
}: {
  row: ConversationRow;
  isActive: boolean;
  onClick: () => void;
}) {
  const isUnread = row.status === 'open' && !row.assigned_agent_id;
  const preview = getPreviewText(row.lastMessage);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
        isActive ? 'bg-[#F0FDF4]' : ''
      }`}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 flex items-center self-stretch">
        <div
          className={`w-2 h-2 rounded-full ${isUnread ? 'bg-[#25D366]' : 'bg-transparent'}`}
        />
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-semibold text-sm">
        {initials(row.contact?.name ?? row.contact?.phone)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {row.contact?.name ?? row.contact?.phone ?? 'Unknown'}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatRelativeTime(row.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-gray-500 truncate">{preview}</span>
          <StatusBadge status={row.status} />
        </div>
        {row.contact?.phone && row.contact?.name && (
          <p className="text-xs text-gray-400 mt-0.5">{row.contact.phone}</p>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    assigned: 'bg-blue-100 text-blue-700',
    resolved: 'bg-gray-100 text-gray-500',
    archived: 'bg-gray-100 text-gray-400',
  };
  return (
    <span
      className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded-full font-medium capitalize ${
        map[status] ?? 'bg-gray-100 text-gray-500'
      }`}
    >
      {status}
    </span>
  );
}

function getPreviewText(
  msg: ConversationRow['lastMessage'],
): string {
  if (!msg) return 'No messages yet';
  const prefix = msg.direction === 'outbound' ? 'You: ' : '';
  if (msg.type === 'text') return `${prefix}${msg.content ?? ''}`;
  return `${prefix}📎 ${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}`;
}

function ConversationListSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
