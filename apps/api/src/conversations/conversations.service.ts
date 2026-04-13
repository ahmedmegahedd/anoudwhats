import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Conversation, ConversationStatus } from '@anoud-job/types';

@Injectable()
export class ConversationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async assign(
    id: string,
    agentId?: string | null,
    teamId?: string | null,
  ): Promise<Conversation> {
    const db = this.supabaseService.getClient();

    const update: Record<string, unknown> = { status: 'assigned' };
    if (agentId !== undefined) update.assigned_agent_id = agentId;
    if (teamId !== undefined) update.assigned_team_id = teamId;

    const { data, error } = await db
      .from('conversations')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException(`Conversation ${id} not found`);
    return data as Conversation;
  }

  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    const db = this.supabaseService.getClient();

    const { data, error } = await db
      .from('conversations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException(`Conversation ${id} not found`);
    return data as Conversation;
  }
}
