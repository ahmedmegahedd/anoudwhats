import type {
  Conversation,
  ConversationStatus,
  MessageDirection,
  MessageType,
} from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { NotFoundError } from '../errors';

export interface ConversationListItem {
  id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  assigned_agent_id: string | null;
  assigned_team_id: string | null;
  contact: { id: string; name: string | null; phone: string };
  lastMessage: {
    content: string | null;
    type: MessageType;
    direction: MessageDirection;
    created_at: string;
  } | null;
}

export async function listConversations(opts: {
  includeArchived?: boolean;
  limit?: number;
} = {}): Promise<ConversationListItem[]> {
  const db = getSupabaseAdmin();
  const limit = opts.limit ?? 200;

  let q = db
    .from('conversations')
    .select(
      'id, status, last_message_at, assigned_agent_id, assigned_team_id, contacts(id, name, phone)',
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!opts.includeArchived) q = q.neq('status', 'archived');

  const { data: convs, error } = await q;
  if (error) throw new Error(`listConversations failed: ${error.message}`);
  if (!convs?.length) return [];

  const ids = convs.map((c) => c.id as string);
  const { data: msgs } = await db
    .from('messages')
    .select('conversation_id, content, type, direction, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false });

  const lastMsgMap: Record<string, ConversationListItem['lastMessage']> = {};
  msgs?.forEach((m) => {
    const cid = m.conversation_id as string;
    if (!lastMsgMap[cid]) {
      lastMsgMap[cid] = {
        content: (m.content as string | null) ?? null,
        type: m.type as MessageType,
        direction: m.direction as MessageDirection,
        created_at: m.created_at as string,
      };
    }
  });

  return convs.map((c) => ({
    id: c.id as string,
    status: c.status as ConversationStatus,
    last_message_at: (c.last_message_at as string | null) ?? null,
    assigned_agent_id: (c.assigned_agent_id as string | null) ?? null,
    assigned_team_id: (c.assigned_team_id as string | null) ?? null,
    contact: c.contacts as unknown as ConversationListItem['contact'],
    lastMessage: lastMsgMap[c.id as string] ?? null,
  }));
}

export async function getConversation(id: string): Promise<{
  id: string;
  status: ConversationStatus;
  assigned_agent_id: string | null;
  contact: { id: string; name: string | null; phone: string };
}> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('conversations')
    .select('id, status, assigned_agent_id, contacts(id, name, phone)')
    .eq('id', id)
    .single();
  if (error || !data) throw new NotFoundError(`Conversation ${id} not found`);
  return {
    id: data.id as string,
    status: data.status as ConversationStatus,
    assigned_agent_id: (data.assigned_agent_id as string | null) ?? null,
    contact: data.contacts as unknown as {
      id: string;
      name: string | null;
      phone: string;
    },
  };
}

export async function assignConversation(
  id: string,
  agentId?: string | null,
  teamId?: string | null,
): Promise<Conversation> {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = { status: 'assigned' };
  if (agentId !== undefined) update.assigned_agent_id = agentId;
  if (teamId !== undefined) update.assigned_team_id = teamId;

  const { data, error } = await db
    .from('conversations')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new NotFoundError(`Conversation ${id} not found`);
  return data as Conversation;
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<Conversation> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('conversations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new NotFoundError(`Conversation ${id} not found`);
  return data as Conversation;
}
