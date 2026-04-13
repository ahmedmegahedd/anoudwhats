'use client';

import Avatar from '@/components/ui/Avatar';
import { channelClass, formatEGP, stageClass, tagColor } from './shared';
import type { ContactRowWithRelations } from '@/hooks/useContacts';

interface Props {
  contacts: ContactRowWithRelations[];
  onView: (contact: ContactRowWithRelations) => void;
  onEdit: (contact: ContactRowWithRelations) => void;
  onDelete: (contact: ContactRowWithRelations) => void;
}

export default function ContactsCards({
  contacts,
  onView,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts.map((c) => (
        <div
          key={c.id}
          className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
        >
          {/* Top */}
          <div className="flex items-start gap-3">
            <Avatar name={c.name ?? c.phone} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {c.name ?? 'Unknown'}
              </p>
              <p className="text-[11px] text-gray-500">{c.phone}</p>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${stageClass(c.pipeline_stage)}`}
            >
              {c.pipeline_stage}
            </span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {c.channel && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelClass(c.channel)}`}
              >
                {c.channel}
              </span>
            )}
            {c.source && (
              <span className="text-[11px] text-gray-500">{c.source}</span>
            )}
          </div>

          {/* Tags */}
          {c.tags && c.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {c.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tagColor(t)}`}
                >
                  {t}
                </span>
              ))}
              {c.tags.length > 3 && (
                <span className="text-[10px] text-gray-500">
                  +{c.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Deal + Agent */}
          {(c.deal_value !== null || c.agent) && (
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
              {c.deal_value !== null ? (
                <span className="font-semibold text-gray-900">
                  {formatEGP(c.deal_value)}
                </span>
              ) : (
                <span className="text-gray-400">No deal value</span>
              )}
              {c.agent ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={c.agent.full_name} size="sm" />
                  <span className="text-[11px] text-gray-600 truncate max-w-[100px]">
                    {c.agent.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-gray-400">Unassigned</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
            <button
              onClick={() => onView(c)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-[#25D366] border border-[#25D366] rounded hover:bg-green-50 transition-colors"
            >
              View Details
            </button>
            <button
              onClick={() => onEdit(c)}
              className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(c)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
