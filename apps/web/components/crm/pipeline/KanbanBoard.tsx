'use client';

import { apiFetch } from '@/lib/api/client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useToast } from '@/components/ui/Toast';
import KanbanColumn from './KanbanColumn';
import DealCardOverlay from './DealCardOverlay';
import { PIPELINE_STAGES } from './shared';
import type { DealCard as DealCardType } from '@/hooks/usePipeline';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props {
  stages: Record<string, DealCardType[]>;
  setStages: React.Dispatch<React.SetStateAction<Record<string, DealCardType[]>>>;
  onAddDeal: (stage: string) => void;
  onEditDeal: (deal: DealCardType, anchor: HTMLElement) => void;
  onOpenChat: (deal: DealCardType) => void;
  onViewContact: (deal: DealCardType) => void;
}

export default function KanbanBoard({
  stages,
  setStages,
  onAddDeal,
  onEditDeal,
  onOpenChat,
  onViewContact,
}: Props) {
  const toast = useToast();
  const [activeDeal, setActiveDeal] = useState<DealCardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function findContainer(id: string): string | null {
    // If id is a column-xxx, return the stage name
    if (id.startsWith('column-')) return id.replace('column-', '');
    // Otherwise find which stage contains this deal
    for (const stage of Object.keys(stages)) {
      if (stages[stage].some((d) => d.id === id)) return stage;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    for (const list of Object.values(stages)) {
      const found = list.find((d) => d.id === id);
      if (found) {
        setActiveDeal(found);
        return;
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const fromStage = findContainer(activeId);
    const toStage = findContainer(overId);
    if (!fromStage || !toStage) return;

    // No-op if dropped in same stage
    if (fromStage === toStage) return;

    // Snapshot for rollback
    const snapshot = { ...stages };

    // Optimistic: move card to new stage
    setStages((prev) => {
      const deal = prev[fromStage]?.find((d) => d.id === activeId);
      if (!deal) return prev;
      return {
        ...prev,
        [fromStage]: prev[fromStage].filter((d) => d.id !== activeId),
        [toStage]: [{ ...deal, pipeline_stage: toStage }, ...prev[toStage]],
      };
    });

    // Persist
    try {
      const res = await apiFetch(`${API_URL}/pipeline/${activeId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStage: toStage, oldStage: fromStage }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast(`Moved to ${toStage}`, 'success');
    } catch (err) {
      // Rollback
      setStages(snapshot);
      toast(err instanceof Error ? err.message : 'Failed to move deal', 'error');
    }
  }

  function handleDragCancel() {
    setActiveDeal(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-6 h-full">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.name}
            stage={stage.name}
            deals={stages[stage.name] ?? []}
            onAddDeal={onAddDeal}
            onEditDeal={onEditDeal}
            onOpenChat={onOpenChat}
            onViewContact={onViewContact}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
