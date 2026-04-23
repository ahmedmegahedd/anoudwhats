'use client';

import { apiFetch } from '@/lib/api/client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline, type DealCard, type PipelineFilters } from '@/hooks/usePipeline';
import KanbanBoard from '@/components/crm/pipeline/KanbanBoard';
import ForecastView from '@/components/crm/pipeline/ForecastView';
import AddDealModal from '@/components/crm/pipeline/AddDealModal';
import DealQuickEdit from '@/components/crm/pipeline/DealQuickEdit';
import PipelineFilterPanel, {
  countPipelineFilters,
} from '@/components/crm/pipeline/PipelineFilterPanel';

type View = 'kanban' | 'forecast';

export default function PipelinePage() {
  const router = useRouter();
  const [view, setView] = useState<View>('kanban');
  const [filters, setFilters] = useState<PipelineFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [addDealStage, setAddDealStage] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<{
    deal: DealCard;
    anchor: HTMLElement;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { stages, setStages, loading, refetch } = usePipeline(filters);

  const activeFilterCount = useMemo(() => countPipelineFilters(filters), [filters]);

  function openAddDeal(stage?: string) {
    setAddDealStage(stage ?? 'Lead');
  }

  async function handleOpenChat(deal: DealCard) {
    // Navigate to inbox with the contact's conversation
    try {
      const API_URL = '/api';
      const res = await apiFetch(`${API_URL}/contacts/${deal.id}`);
      if (!res.ok) throw new Error('not found');
      const data = (await res.json()) as {
        conversations: Array<{ id: string }>;
      };
      const first = data.conversations?.[0];
      if (first) {
        router.push(`/inbox?conversation=${first.id}`);
      } else {
        router.push('/inbox');
      }
    } catch {
      router.push('/inbox');
    }
  }

  function handleViewContact(deal: DealCard) {
    router.push(`/crm/contacts?contact=${deal.id}`);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Pipeline</h1>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'kanban'
                  ? 'bg-[#25D366] text-white shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('forecast')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'forecast'
                  ? 'bg-[#25D366] text-white shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Forecast
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterPanelOpen(true)}
            className="relative px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-[#25D366] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => openAddDeal('Lead')}
            className="px-3 py-2 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            + Add Deal
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          loading && Object.keys(stages).length === 0 ? (
            <p className="text-sm text-gray-400 px-6 py-4">Loading pipeline…</p>
          ) : (
            <div className="h-full py-4">
              <KanbanBoard
                stages={stages}
                setStages={setStages}
                onAddDeal={openAddDeal}
                onEditDeal={(deal, anchor) => setQuickEdit({ deal, anchor })}
                onOpenChat={handleOpenChat}
                onViewContact={handleViewContact}
              />
            </div>
          )
        ) : (
          <ForecastView filters={filters} refreshKey={refreshKey} />
        )}
      </div>

      {/* Filter panel */}
      <PipelineFilterPanel
        open={filterPanelOpen}
        filters={filters}
        onClose={() => setFilterPanelOpen(false)}
        onApply={(f) => setFilters(f)}
      />

      {/* Add deal */}
      {addDealStage && (
        <AddDealModal
          initialStage={addDealStage}
          onClose={() => setAddDealStage(null)}
          onSaved={() => {
            setAddDealStage(null);
            refetch();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Quick edit */}
      {quickEdit && (
        <DealQuickEdit
          deal={quickEdit.deal}
          anchor={quickEdit.anchor}
          onClose={() => setQuickEdit(null)}
          onSaved={() => {
            setQuickEdit(null);
            refetch();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
