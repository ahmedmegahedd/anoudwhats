'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DealCard from './DealCard';
import { formatEGP, stageColor } from './shared';
import type { DealCard as DealCardType } from '@/hooks/usePipeline';

interface Props {
  stage: string;
  deals: DealCardType[];
  onAddDeal: (stage: string) => void;
  onEditDeal: (deal: DealCardType, anchor: HTMLElement) => void;
  onOpenChat: (deal: DealCardType) => void;
  onViewContact: (deal: DealCardType) => void;
}

export default function KanbanColumn({
  stage,
  deals,
  onAddDeal,
  onEditDeal,
  onOpenChat,
  onViewContact,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage}`,
    data: { stage, type: 'column' },
  });

  const totalValue = deals.reduce((sum, d) => sum + (d.deal_value ?? 0), 0);
  const color = stageColor(stage);

  return (
    <div className="flex flex-col flex-shrink-0 w-[300px] bg-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <p className="text-sm font-bold text-gray-900">{stage}</p>
            <span className="text-[11px] text-gray-500">
              {deals.length} deal{deals.length === 1 ? '' : 's'}
            </span>
          </div>
          <button
            onClick={() => onAddDeal(stage)}
            className="p-1 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-colors"
            title="Add deal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-gray-500">{formatEGP(totalValue)}</p>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${
          isOver ? 'bg-green-50' : ''
        }`}
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs text-gray-400 mb-2">No deals in this stage</p>
              <button
                onClick={() => onAddDeal(stage)}
                className="text-xs font-medium text-[#25D366] hover:underline"
              >
                + Add Deal
              </button>
            </div>
          ) : (
            deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onEdit={onEditDeal}
                onOpenChat={onOpenChat}
                onView={onViewContact}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
