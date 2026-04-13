'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import StatusDot from '@/components/ui/StatusDot';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { AgentWithTeam } from '@/lib/types';

type Availability = 'online' | 'away' | 'offline';

const AVAILABILITY_CYCLE: Record<Availability, Availability> = {
  online: 'away',
  away: 'offline',
  offline: 'online',
};

interface AgentsTableProps {
  agents: AgentWithTeam[];
  onRefresh: () => Promise<void>;
  onEdit: (agent: AgentWithTeam) => void;
}

export default function AgentsTable({
  agents: initialAgents,
  onRefresh,
  onEdit,
}: AgentsTableProps) {
  const [agents, setAgents] = useState<AgentWithTeam[]>(initialAgents);
  const [editingMaxChats, setEditingMaxChats] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AgentWithTeam | null>(null);
  const maxChatsInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Sync when parent refreshes
  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingMaxChats) {
      setTimeout(() => maxChatsInputRef.current?.select(), 0);
    }
  }, [editingMaxChats]);

  // ── Availability toggle ────────────────────────────────────────────────
  async function cycleAvailability(agent: AgentWithTeam) {
    const next = AVAILABILITY_CYCLE[agent.availability];
    // Optimistic update
    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, availability: next } : a)),
    );
    try {
      await api.patch(`/agents/${agent.id}/availability`, {
        availability: next,
      });
    } catch {
      // Rollback
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agent.id ? { ...a, availability: agent.availability } : a,
        ),
      );
      toast('Failed to update availability', 'error');
    }
  }

  // ── Max chats inline edit ──────────────────────────────────────────────
  async function saveMaxChats() {
    if (!editingMaxChats) return;
    const value = parseInt(editingMaxChats.value, 10);

    setEditingMaxChats(null);

    if (isNaN(value) || value < 1 || value > 50) return;

    // Find original for rollback
    const original = agents.find((a) => a.id === editingMaxChats.id);

    setAgents((prev) =>
      prev.map((a) =>
        a.id === editingMaxChats.id ? { ...a, max_chats: value } : a,
      ),
    );

    try {
      await api.patch(`/agents/${editingMaxChats.id}`, { max_chats: value });
    } catch {
      if (original) {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === editingMaxChats.id
              ? { ...a, max_chats: original.max_chats }
              : a,
          ),
        );
      }
      toast('Failed to update max chats', 'error');
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api.delete(`/agents/${pendingDelete.id}`);
      toast(`${pendingDelete.full_name} removed`);
      setPendingDelete(null);
      await onRefresh();
    } catch {
      toast('Failed to remove agent', 'error');
      setPendingDelete(null);
    }
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-gray-600">No agents yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Invite an agent to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {[
                'Agent',
                'Role',
                'Team',
                'Availability',
                'Open Chats',
                'Max Chats',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                editingMaxChats={editingMaxChats}
                maxChatsInputRef={maxChatsInputRef}
                onCycleAvailability={() => cycleAvailability(agent)}
                onStartEditMaxChats={() =>
                  setEditingMaxChats({
                    id: agent.id,
                    value: String(agent.max_chats),
                  })
                }
                onMaxChatsChange={(v) =>
                  setEditingMaxChats({ id: agent.id, value: v })
                }
                onSaveMaxChats={saveMaxChats}
                onEdit={() => onEdit(agent)}
                onDelete={() => setPendingDelete(agent)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove Agent"
        description={`Are you sure you want to remove ${pendingDelete?.full_name ?? 'this agent'} from the system? This will unassign them from all conversations.`}
        confirmLabel="Remove Agent"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

// ── Row sub-component ─────────────────────────────────────────────────────────

interface AgentRowProps {
  agent: AgentWithTeam;
  editingMaxChats: { id: string; value: string } | null;
  maxChatsInputRef: React.RefObject<HTMLInputElement>;
  onCycleAvailability: () => void;
  onStartEditMaxChats: () => void;
  onMaxChatsChange: (v: string) => void;
  onSaveMaxChats: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AgentRow({
  agent,
  editingMaxChats,
  maxChatsInputRef,
  onCycleAvailability,
  onStartEditMaxChats,
  onMaxChatsChange,
  onSaveMaxChats,
  onEdit,
  onDelete,
}: AgentRowProps) {
  const isEditingMaxChats =
    editingMaxChats?.id === agent.id;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Agent */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={agent.full_name} size="md" />
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusDot status={agent.availability} size="sm" />
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 whitespace-nowrap">
              {agent.full_name}
            </p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <RoleBadge role={agent.role} />
      </td>

      {/* Team */}
      <td className="px-4 py-3">
        {agent.team ? (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: agent.team.color }}
            />
            <span className="text-gray-700">{agent.team.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      {/* Availability */}
      <td className="px-4 py-3">
        <button
          onClick={onCycleAvailability}
          title="Click to cycle availability"
          className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <StatusDot status={agent.availability} showLabel />
        </button>
      </td>

      {/* Open Chats */}
      <td className="px-4 py-3 text-gray-700 tabular-nums">
        {agent.openConversations}
      </td>

      {/* Max Chats — inline editable */}
      <td className="px-4 py-3">
        {isEditingMaxChats ? (
          <input
            ref={maxChatsInputRef}
            type="number"
            min={1}
            max={50}
            value={editingMaxChats.value}
            onChange={(e) => onMaxChatsChange(e.target.value)}
            onBlur={onSaveMaxChats}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveMaxChats();
              if (e.key === 'Escape') onSaveMaxChats();
            }}
            className="w-16 px-2 py-1 text-sm border border-[#25D366] rounded-lg outline-none text-center tabular-nums"
          />
        ) : (
          <button
            onClick={onStartEditMaxChats}
            title="Click to edit"
            className="w-16 text-center text-gray-700 hover:bg-gray-100 rounded-lg px-2 py-1 tabular-nums transition-colors"
          >
            {agent.max_chats}
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: 'admin' | 'agent' }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
        role === 'admin'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      {role}
    </span>
  );
}
