'use client';

import Avatar from '@/components/ui/Avatar';
import { channelClass, formatEGP, relativeTime, stageClass, tagColor } from './shared';
import type { ContactRowWithRelations } from '@/hooks/useContacts';

interface Props {
  contacts: ContactRowWithRelations[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onView: (contact: ContactRowWithRelations) => void;
  onEdit: (contact: ContactRowWithRelations) => void;
  onDelete: (contact: ContactRowWithRelations) => void;
}

export default function ContactsTable({
  contacts,
  selected,
  onToggleSelect,
  onToggleAll,
  onView,
  onEdit,
  onDelete,
}: Props) {
  const allSelected =
    contacts.length > 0 && contacts.every((c) => selected.has(c.id));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                />
              </th>
              <HeaderCell>Contact</HeaderCell>
              <HeaderCell>Company</HeaderCell>
              <HeaderCell>Channel</HeaderCell>
              <HeaderCell>Source</HeaderCell>
              <HeaderCell>Campaign</HeaderCell>
              <HeaderCell>Stage</HeaderCell>
              <HeaderCell>Tags</HeaderCell>
              <HeaderCell>Agent</HeaderCell>
              <HeaderCell>Deal Value</HeaderCell>
              <HeaderCell>Created</HeaderCell>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(c.id)}
                      className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                    />
                  </td>
                  {/* Contact */}
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onView(c)}
                      className="flex items-center gap-2 text-left"
                    >
                      <Avatar name={c.name ?? c.phone} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
                          {c.name ?? 'Unknown'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {c.phone}
                        </p>
                      </div>
                    </button>
                  </td>
                  {/* Company */}
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate">
                    {c.company ?? '—'}
                  </td>
                  {/* Channel */}
                  <td className="px-3 py-3">
                    {c.channel ? (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelClass(c.channel)}`}
                      >
                        {c.channel}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  {/* Source */}
                  <td className="px-3 py-3 text-xs text-gray-500 max-w-[120px] truncate">
                    {c.source ?? '—'}
                  </td>
                  {/* Campaign */}
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate">
                    {c.campaign?.name ?? '—'}
                  </td>
                  {/* Stage */}
                  <td className="px-3 py-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageClass(c.pipeline_stage)}`}
                    >
                      {c.pipeline_stage}
                    </span>
                  </td>
                  {/* Tags */}
                  <td className="px-3 py-3">
                    <TagsCell tags={c.tags ?? []} />
                  </td>
                  {/* Agent */}
                  <td className="px-3 py-3">
                    {c.agent ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={c.agent.full_name} size="sm" />
                        <span className="text-xs text-gray-700 truncate max-w-[100px]">
                          {c.agent.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Unassigned</span>
                    )}
                  </td>
                  {/* Deal Value */}
                  <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {formatEGP(c.deal_value)}
                  </td>
                  {/* Created */}
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {relativeTime(c.created_at)}
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onView(c)}
                        className="px-2.5 py-1 text-[11px] font-medium text-[#25D366] border border-[#25D366] rounded hover:bg-green-50 transition-colors"
                      >
                        View
                      </button>
                      <RowMenu
                        onEdit={() => onEdit(c)}
                        onDelete={() => onDelete(c)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">
      {children}
    </th>
  );
}

function TagsCell({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-xs text-gray-400">—</span>;
  const visible = tags.slice(0, 2);
  const hidden = tags.length - visible.length;
  return (
    <div className="flex items-center gap-1">
      {visible.map((t) => (
        <span
          key={t}
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tagColor(t)}`}
        >
          {t}
        </span>
      ))}
      {hidden > 0 && (
        <span
          title={tags.slice(2).join(', ')}
          className="text-[10px] font-medium text-gray-500"
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  // Simple inline actions — no dropdown complexity
  return (
    <>
      <button
        onClick={onEdit}
        className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-colors"
        title="Edit"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Delete"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </>
  );
}
