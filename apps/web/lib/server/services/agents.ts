import { getSupabaseAdmin } from '../supabase';
import { NotFoundError } from '../errors';

export type Availability = 'online' | 'away' | 'offline';

export interface UpdateAgentInput {
  full_name?: string;
  role?: 'admin' | 'agent';
  team_id?: string | null;
  max_chats?: number;
  availability?: Availability;
}

const SELECT =
  'id, full_name, avatar_url, role, availability, max_chats, created_at, team:teams(id, name, color)';

function normalizeTeam(team: unknown) {
  return (Array.isArray(team) ? (team[0] ?? null) : team) as {
    id: string;
    name: string;
    color: string;
  } | null;
}

export async function findAllAgents() {
  const db = getSupabaseAdmin();
  const [profilesResult, openConvsResult] = await Promise.all([
    db.from('profiles').select(SELECT).order('created_at', { ascending: true }),
    db
      .from('conversations')
      .select('assigned_agent_id')
      .or('status.eq.open,status.eq.assigned')
      .not('assigned_agent_id', 'is', null),
  ]);

  const openCountMap: Record<string, number> = {};
  openConvsResult.data?.forEach((c) => {
    if (c.assigned_agent_id) {
      openCountMap[c.assigned_agent_id] =
        (openCountMap[c.assigned_agent_id] ?? 0) + 1;
    }
  });

  return (profilesResult.data ?? []).map((agent) => ({
    ...agent,
    team: normalizeTeam(agent.team),
    openConversations: openCountMap[agent.id] ?? 0,
  }));
}

export async function findAgent(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('profiles')
    .select(SELECT)
    .eq('id', id)
    .single();
  if (error) throw new NotFoundError(`Agent ${id} not found`);
  return { ...data, team: normalizeTeam(data.team) };
}

export async function updateAgent(id: string, dto: UpdateAgentInput) {
  const db = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};
  if (dto.full_name !== undefined) updates.full_name = dto.full_name;
  if (dto.role !== undefined) updates.role = dto.role;
  if (dto.team_id !== undefined) updates.team_id = dto.team_id;
  if (dto.max_chats !== undefined) updates.max_chats = dto.max_chats;
  if (dto.availability !== undefined) updates.availability = dto.availability;

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new NotFoundError(`Agent ${id} not found`);
  return data;
}

export async function updateAgentAvailability(id: string, availability: Availability) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('profiles')
    .update({ availability })
    .eq('id', id)
    .select('id, availability')
    .single();
  if (error) throw new NotFoundError(`Agent ${id} not found`);
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('profiles').delete().eq('id', id);
  if (error) throw new NotFoundError(`Agent ${id} not found`);
}

export async function getAgentStats(id: string) {
  const db = getSupabaseAdmin();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const [totalResult, openResult, resolvedTodayResult] = await Promise.all([
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_agent_id', id),
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_agent_id', id)
      .or('status.eq.open,status.eq.assigned'),
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_agent_id', id)
      .eq('status', 'resolved')
      .gte('last_message_at', todayMidnight.toISOString()),
  ]);

  return {
    totalConversations: totalResult.count ?? 0,
    openConversations: openResult.count ?? 0,
    resolvedToday: resolvedTodayResult.count ?? 0,
  };
}
