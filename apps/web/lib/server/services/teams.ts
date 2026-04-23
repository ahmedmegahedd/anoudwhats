import { getSupabaseAdmin } from '../supabase';
import { BadRequestError, NotFoundError } from '../errors';

export interface CreateTeamInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  color?: string;
}

export async function findAllTeams() {
  const db = getSupabaseAdmin();
  const [teamsResult, profilesResult] = await Promise.all([
    db.from('teams').select('*').order('created_at', { ascending: true }),
    db.from('profiles').select('team_id').not('team_id', 'is', null),
  ]);

  const countMap: Record<string, number> = {};
  profilesResult.data?.forEach((p) => {
    if (p.team_id) countMap[p.team_id] = (countMap[p.team_id] ?? 0) + 1;
  });

  return (teamsResult.data ?? []).map((t) => ({
    ...t,
    memberCount: countMap[t.id] ?? 0,
  }));
}

export async function findTeam(id: string) {
  const db = getSupabaseAdmin();
  const [teamResult, membersResult] = await Promise.all([
    db.from('teams').select('*').eq('id', id).single(),
    db
      .from('profiles')
      .select('id, full_name, avatar_url, role, availability')
      .eq('team_id', id),
  ]);
  if (teamResult.error) throw new NotFoundError(`Team ${id} not found`);
  return {
    ...teamResult.data,
    memberCount: membersResult.data?.length ?? 0,
    members: membersResult.data ?? [],
  };
}

export async function createTeam(dto: CreateTeamInput) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('teams')
    .insert({
      name: dto.name,
      description: dto.description ?? null,
      color: dto.color ?? '#25D366',
    })
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  return data;
}

export async function updateTeam(id: string, dto: UpdateTeamInput) {
  const db = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.color !== undefined) updates.color = dto.color;

  const { data, error } = await db
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new NotFoundError(`Team ${id} not found`);
  return data;
}

export async function deleteTeam(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('teams').delete().eq('id', id);
  if (error) throw new NotFoundError(`Team ${id} not found`);
}

export async function addTeamMember(teamId: string, agentId: string) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('profiles')
    .update({ team_id: teamId })
    .eq('id', agentId);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}

export async function removeTeamMember(teamId: string, agentId: string) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('profiles')
    .update({ team_id: null })
    .eq('id', agentId)
    .eq('team_id', teamId);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}
