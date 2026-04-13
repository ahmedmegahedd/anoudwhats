import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateAgentDto } from './dto/update-agent.dto';

type Availability = 'online' | 'away' | 'offline';

@Injectable()
export class AgentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const db = this.supabaseService.getClient();

    const [profilesResult, openConvsResult] = await Promise.all([
      db
        .from('profiles')
        .select(
          'id, full_name, avatar_url, role, availability, max_chats, created_at, team:teams(id, name, color)',
        )
        .order('created_at', { ascending: true }),
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
      // Supabase returns FK-joined rows as array in the inferred type; normalise to single object
      team: (Array.isArray(agent.team)
        ? (agent.team[0] ?? null)
        : agent.team) as { id: string; name: string; color: string } | null,
      openConversations: openCountMap[agent.id] ?? 0,
    }));
  }

  async findOne(id: string) {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('profiles')
      .select(
        'id, full_name, avatar_url, role, availability, max_chats, created_at, team:teams(id, name, color)',
      )
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException(`Agent ${id} not found`);
    return {
      ...data,
      team: (Array.isArray(data.team)
        ? (data.team[0] ?? null)
        : data.team) as { id: string; name: string; color: string } | null,
    };
  }

  async update(id: string, dto: UpdateAgentDto) {
    const db = this.supabaseService.getClient();

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

    if (error) throw new NotFoundException(`Agent ${id} not found`);
    return data;
  }

  async updateAvailability(id: string, availability: Availability) {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('profiles')
      .update({ availability })
      .eq('id', id)
      .select('id, availability')
      .single();

    if (error) throw new NotFoundException(`Agent ${id} not found`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const db = this.supabaseService.getClient();
    // Deletes the profile row only; auth.users entry remains (manage via Supabase dashboard)
    const { error } = await db.from('profiles').delete().eq('id', id);
    if (error) throw new NotFoundException(`Agent ${id} not found`);
  }

  async getStats(id: string) {
    const db = this.supabaseService.getClient();

    // Use today midnight as proxy for "today" since conversations table has no updated_at
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
}
