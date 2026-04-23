'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import CampaignCard, {
  type CampaignListItem,
} from '@/components/crm/campaigns/CampaignCard';
import CampaignDetail from '@/components/crm/campaigns/CampaignDetail';
import CampaignModal from '@/components/crm/campaigns/CampaignModal';
import { useCampaignDetail } from '@/hooks/useCampaignDetail';
import type { Campaign } from '@anoud-job/types';

const API_URL = '/api';

export default function CampaignsPage() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/campaigns`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CampaignListItem[];
      setCampaigns(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, selectedId]);

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { detail, refetch: refetchDetail } = useCampaignDetail(selectedId);

  function handleSaved(c: Campaign, mode: 'create' | 'edit') {
    setCreating(false);
    setEditing(null);
    loadCampaigns();
    if (mode === 'create') setSelectedId(c.id);
    if (mode === 'edit') refetchDetail();
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Campaigns</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-2 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
        >
          + New Campaign
        </button>
      </div>

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left list */}
        <aside className="w-[340px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-gray-400">Loading…</p>
          ) : campaigns.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-2">No campaigns yet</p>
              <button
                onClick={() => setCreating(true)}
                className="text-xs font-medium text-[#25D366] hover:underline"
              >
                + Create your first campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  active={selectedId === c.id}
                  onClick={() => setSelectedId(c.id)}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Right detail */}
        <div className="flex-1 overflow-hidden">
          {selectedId && detail ? (
            <CampaignDetail
              detail={detail}
              onEdit={(c) => setEditing(c)}
              onDeleted={() => {
                setSelectedId(null);
                loadCampaigns();
              }}
              onRefresh={() => {
                refetchDetail();
                loadCampaigns();
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Select a campaign to see details
            </div>
          )}
        </div>
      </div>

      {(creating || editing) && (
        <CampaignModal
          campaign={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
