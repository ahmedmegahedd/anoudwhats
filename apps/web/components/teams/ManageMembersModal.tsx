'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import StatusDot from '@/components/ui/StatusDot';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { AgentWithTeam, TeamMember, TeamWithCount } from '@/lib/types';

interface ManageMembersModalProps {
  team: TeamWithCount;
  allAgents: AgentWithTeam[];
  onClose: () => void;
}

export default function ManageMembersModal({
  team,
  allAgents,
  onClose,
}: ManageMembersModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  // Fetch current members on mount
  useEffect(() => {
    fetchMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function fetchMembers() {
    try {
      const data = await api.get<{ members: TeamMember[] }>(`/teams/${team.id}`);
      setMembers(data.members ?? []);
    } catch {
      toast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Remove member ──────────────────────────────────────────────────────
  async function removeMember(agent: TeamMember) {
    const prev = [...members];
    setMembers((m) => m.filter((x) => x.id !== agent.id));
    try {
      await api.delete(`/teams/${team.id}/members/${agent.id}`);
    } catch {
      setMembers(prev);
      toast(`Failed to remove ${agent.full_name}`, 'error');
    }
  }

  // ── Add member ─────────────────────────────────────────────────────────
  async function addMember(agent: AgentWithTeam) {
    const newMember: TeamMember = {
      id: agent.id,
      full_name: agent.full_name,
      avatar_url: agent.avatar_url,
      role: agent.role,
      availability: agent.availability,
    };
    setMembers((m) => [...m, newMember]);
    try {
      await api.post(`/teams/${team.id}/members`, { agentId: agent.id });
    } catch {
      setMembers((m) => m.filter((x) => x.id !== agent.id));
      toast(`Failed to add ${agent.full_name}`, 'error');
    }
  }

  const memberIds = new Set(members.map((m) => m.id));
  const available = allAgents.filter(
    (a) =>
      !memberIds.has(a.id) &&
      a.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Manage Members
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Team:{' '}
              <span className="font-medium" style={{ color: team.color }}>
                {team.name}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body — two-column */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Current Members */}
          <div className="w-1/2 border-r border-gray-100 flex flex-col">
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Current Members ({members.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {loading ? (
                <MemberListSkeleton />
              ) : members.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8 px-4">
                  No members yet. Add agents from the right panel.
                </p>
              ) : (
                members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <Avatar name={m.full_name} size="sm" />
                        <span className="absolute -bottom-0.5 -right-0.5">
                          <StatusDot status={m.availability} size="sm" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {m.full_name}
                        </p>
                        <p className="text-[11px] text-gray-400 capitalize">
                          {m.role}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(m)}
                      className="flex-shrink-0 ml-2 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Add Members */}
          <div className="w-1/2 flex flex-col">
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Add Members
              </p>
              <input
                type="text"
                placeholder="Search agents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {available.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8 px-4">
                  {allAgents.length === 0
                    ? 'No agents in the system yet'
                    : allAgents.length === members.length
                      ? 'All agents are already in this team'
                      : 'No agents match your search'}
                </p>
              ) : (
                available.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={a.full_name} size="sm" className="flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {a.full_name}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {a.team ? a.team.name : 'No team'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => addMember(a)}
                      className="flex-shrink-0 ml-2 text-xs font-medium text-[#25D366] hover:text-[#128C7E] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberListSkeleton() {
  return (
    <div className="px-5 py-2 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 animate-pulse">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
