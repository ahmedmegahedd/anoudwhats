'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TeamCard from '@/components/teams/TeamCard';
import TeamModal from '@/components/teams/TeamModal';
import ManageMembersModal from '@/components/teams/ManageMembersModal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { AgentWithTeam, TeamWithCount } from '@/lib/types';

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [allAgents, setAllAgents] = useState<AgentWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState<TeamWithCount | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<TeamWithCount | null>(null);
  const [manageTeam, setManageTeam] = useState<TeamWithCount | null>(null);

  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [teamsData, agentsData] = await Promise.all([
        api.get<TeamWithCount[]>('/teams'),
        api.get<AgentWithTeam[]>('/agents'),
      ]);
      setTeams(teamsData);
      setAllAgents(agentsData);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTeam) return;
    try {
      await api.delete(`/teams/${deleteTeam.id}`);
      toast(`Team "${deleteTeam.name}" deleted`);
      setDeleteTeam(null);
      await fetchData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete team', 'error');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <PageHeader
        title="Teams"
        subtitle="Organise agents into specialised groups"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            + New Team
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <TeamsGridSkeleton />
        ) : teams.length === 0 ? (
          <EmptyTeams onNew={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                members={allAgents.filter((a) => a.team?.id === team.id)}
                onEdit={() => setEditTeam(team)}
                onDelete={() => setDeleteTeam(team)}
                onManageMembers={() => setManageTeam(team)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editTeam) && (
        <TeamModal
          team={editTeam ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditTeam(null);
          }}
          onSaved={fetchData}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTeam}
        title="Delete Team"
        description={`Deleting "${deleteTeam?.name ?? ''}" will unassign all its members. Conversations assigned to this team will remain open.`}
        confirmLabel="Delete Team"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTeam(null)}
      />

      {/* Manage members */}
      {manageTeam && (
        <ManageMembersModal
          team={manageTeam}
          allAgents={allAgents}
          onClose={() => {
            setManageTeam(null);
            fetchData(); // refresh member counts
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyTeams({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">No teams yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Create your first team to organise agents
        </p>
      </div>
      <button
        onClick={onNew}
        className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
      >
        + New Team
      </button>
    </div>
  );
}

function TeamsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
        >
          <div className="h-1.5 bg-gray-200" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 bg-gray-200 rounded flex-1" />
              <div className="h-8 bg-gray-200 rounded w-14" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
