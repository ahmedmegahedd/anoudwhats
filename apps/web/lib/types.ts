// Shared frontend types for agents & teams data shapes returned by the API

export interface AgentWithTeam {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'agent';
  availability: 'online' | 'away' | 'offline';
  max_chats: number;
  created_at: string;
  team: { id: string; name: string; color: string } | null;
  openConversations: number;
}

export interface TeamBasic {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface TeamWithCount extends TeamBasic {
  memberCount: number;
}

export interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'agent';
  availability: 'online' | 'away' | 'offline';
}

export interface TeamWithMembers extends TeamWithCount {
  members: TeamMember[];
}

export interface AgentStats {
  totalConversations: number;
  openConversations: number;
  resolvedToday: number;
}
