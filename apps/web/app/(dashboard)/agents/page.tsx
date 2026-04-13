'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import AgentsTable from '@/components/agents/AgentsTable';
import EditAgentModal from '@/components/agents/EditAgentModal';
import InviteAgentModal from '@/components/agents/InviteAgentModal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { AgentWithTeam, TeamBasic } from '@/lib/types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentWithTeam[]>([]);
  const [teams, setTeams] = useState<TeamBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentWithTeam | null>(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [agentsData, teamsData] = await Promise.all([
        api.get<AgentWithTeam[]>('/agents'),
        api.get<TeamBasic[]>('/teams'),
      ]);
      setAgents(agentsData);
      setTeams(teamsData);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const totalAgents = agents.length;
  const onlineNow = agents.filter((a) => a.availability === 'online').length;
  const avgOpenChats =
    agents.length > 0
      ? (
          agents.reduce((s, a) => s + a.openConversations, 0) / agents.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <PageHeader
        title="Agents"
        subtitle="Manage your support team members"
        action={
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            + Invite Agent
          </button>
        }
      />

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 flex-shrink-0">
        <StatCard label="Total Agents" value={totalAgents} loading={loading} />
        <StatCard
          label="Online Now"
          value={onlineNow}
          loading={loading}
          accent="green"
        />
        <StatCard
          label="Avg Open Chats"
          value={avgOpenChats}
          loading={loading}
          accent="blue"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <TableSkeleton />
        ) : (
          <AgentsTable
            agents={agents}
            onRefresh={fetchData}
            onEdit={setEditAgent}
          />
        )}
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteAgentModal onClose={() => setShowInvite(false)} />
      )}
      {editAgent && (
        <EditAgentModal
          agent={editAgent}
          teams={teams}
          onClose={() => setEditAgent(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: number | string;
  loading?: boolean;
  accent?: 'green' | 'blue';
}) {
  const accentColor =
    accent === 'green'
      ? 'text-[#25D366]'
      : accent === 'blue'
        ? 'text-blue-600'
        : 'text-gray-900';

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className={`text-2xl font-bold tabular-nums ${accentColor}`}>
          {value}
        </p>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex gap-4">
        {[120, 60, 80, 80, 60, 60, 80].map((w, i) => (
          <div
            key={i}
            className="h-3 bg-gray-200 rounded animate-pulse"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-4 border-b border-gray-50 flex items-center gap-4 animate-pulse"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-16 ml-4" />
          <div className="h-3 bg-gray-200 rounded w-20 ml-4" />
          <div className="h-3 bg-gray-200 rounded w-16 ml-4" />
          <div className="h-3 bg-gray-200 rounded w-8 ml-auto" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
