'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Avatar from '@/components/ui/Avatar';
import { channelClass, tagColor } from '@/components/crm/contacts/shared';
import { formatEGP, relativeTime } from './shared';
import type { DealCard as DealCardType } from '@/hooks/usePipeline';

interface Props {
  deal: DealCardType;
  onEdit: (deal: DealCardType, anchor: HTMLElement) => void;
  onOpenChat: (deal: DealCardType) => void;
  onView: (deal: DealCardType) => void;
}

export default function DealCard({ deal, onEdit, onOpenChat, onView }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-white border border-gray-200 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {deal.name ?? 'Unknown'}
          </p>
          <p className="text-[11px] text-gray-500 truncate">{deal.phone}</p>
        </div>
      </div>

      {/* Company */}
      {deal.company && (
        <p className="text-[11px] text-gray-500 italic truncate mb-1.5">
          {deal.company}
        </p>
      )}

      {/* Channel badge */}
      {deal.channel && (
        <div className="mb-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelClass(deal.channel)}`}
          >
            {deal.channel}
          </span>
        </div>
      )}

      {/* Deal value */}
      <div className="mb-2">
        <p
          className={`text-sm font-bold ${
            deal.deal_value !== null && deal.deal_value !== undefined
              ? 'text-[#128C7E]'
              : 'text-gray-400'
          }`}
        >
          {formatEGP(deal.deal_value)}
        </p>
      </div>

      {/* Agent */}
      <div className="flex items-center gap-1.5 mb-2">
        {deal.agent ? (
          <>
            <Avatar name={deal.agent.full_name} size="sm" />
            <span className="text-[11px] text-gray-700 truncate">
              {deal.agent.full_name}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-gray-400">Unassigned</span>
        )}
      </div>

      {/* Tags */}
      {deal.tags && deal.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {deal.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tagColor(t)}`}
            >
              {t}
            </span>
          ))}
          {deal.tags.length > 2 && (
            <span className="text-[10px] text-gray-500">
              +{deal.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Last activity */}
      <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-2">
        Last seen {relativeTime(deal.last_seen_at)}
      </p>

      {/* Hover actions */}
      <div
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/95 rounded-lg shadow-sm border border-gray-100 p-0.5"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat(deal);
          }}
          className="p-1 text-gray-500 hover:text-[#25D366] hover:bg-green-50 rounded"
          title="Open Chat"
        >
          💬
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(deal, e.currentTarget);
          }}
          className="p-1 text-gray-500 hover:text-[#25D366] hover:bg-green-50 rounded"
          title="Edit Deal"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(deal);
          }}
          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
          title="View Contact"
        >
          👁
        </button>
      </div>
    </div>
  );
}
