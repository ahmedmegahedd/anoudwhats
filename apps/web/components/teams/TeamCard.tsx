import Avatar from '@/components/ui/Avatar';
import type { AgentWithTeam, TeamWithCount } from '@/lib/types';

interface TeamCardProps {
  team: TeamWithCount;
  members: AgentWithTeam[];
  onEdit: () => void;
  onDelete: () => void;
  onManageMembers: () => void;
}

const MAX_AVATARS = 4;

export default function TeamCard({
  team,
  members,
  onEdit,
  onDelete,
  onManageMembers,
}: TeamCardProps) {
  const visible = members.slice(0, MAX_AVATARS);
  const overflow = members.length - MAX_AVATARS;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Color bar */}
      <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: team.color }} />

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Name + description */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: team.color }}
            />
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {team.name}
            </h3>
          </div>
          {team.description ? (
            <p className="text-sm text-gray-500 line-clamp-2">{team.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description</p>
          )}
        </div>

        {/* Member count + avatars */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
          </span>

          {members.length > 0 && (
            <div className="flex items-center">
              {visible.map((m, i) => (
                <div key={m.id} style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: i }}>
                  <Avatar name={m.full_name} size="sm" className="ring-2 ring-white" />
                </div>
              ))}
              {overflow > 0 && (
                <div
                  className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 ring-2 ring-white flex-shrink-0"
                  style={{ marginLeft: '-8px', zIndex: MAX_AVATARS }}
                >
                  +{overflow}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1 mt-auto">
          <button
            onClick={onManageMembers}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Manage Members
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-2 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
