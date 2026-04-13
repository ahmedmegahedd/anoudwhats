import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const db = this.supabaseService.getClient();

    const [teamsResult, profilesResult] = await Promise.all([
      db.from('teams').select('*').order('created_at', { ascending: true }),
      db
        .from('profiles')
        .select('team_id')
        .not('team_id', 'is', null),
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

  async findOne(id: string) {
    const db = this.supabaseService.getClient();

    const [teamResult, membersResult] = await Promise.all([
      db.from('teams').select('*').eq('id', id).single(),
      db
        .from('profiles')
        .select('id, full_name, avatar_url, role, availability')
        .eq('team_id', id),
    ]);

    if (teamResult.error) throw new NotFoundException(`Team ${id} not found`);

    return {
      ...teamResult.data,
      memberCount: membersResult.data?.length ?? 0,
      members: membersResult.data ?? [],
    };
  }

  async create(dto: CreateTeamDto) {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('teams')
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? '#25D366',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdateTeamDto) {
    const db = this.supabaseService.getClient();

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

    if (error) throw new NotFoundException(`Team ${id} not found`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const db = this.supabaseService.getClient();
    // ON DELETE SET NULL in schema handles profile.team_id cleanup automatically
    const { error } = await db.from('teams').delete().eq('id', id);
    if (error) throw new NotFoundException(`Team ${id} not found`);
  }

  async addMember(teamId: string, agentId: string) {
    const db = this.supabaseService.getClient();
    const { error } = await db
      .from('profiles')
      .update({ team_id: teamId })
      .eq('id', agentId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async removeMember(teamId: string, agentId: string) {
    const db = this.supabaseService.getClient();
    const { error } = await db
      .from('profiles')
      .update({ team_id: null })
      .eq('id', agentId)
      .eq('team_id', teamId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
