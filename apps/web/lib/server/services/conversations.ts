import type { Conversation, ConversationStatus } from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { NotFoundError } from '../errors';

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
