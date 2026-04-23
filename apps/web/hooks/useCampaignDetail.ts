'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import type { Campaign } from '@anoud-job/types';

const API_URL = '/api';

export interface CampaignAnalytics {
  totalLeads: number;
  byStage: { stage: string; count: number }[];
  conversionRate: number;
  totalValue: number;
  wonValue: number;
}

export interface CampaignLead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  pipeline_stage: string;
  deal_value: number | null;
  assigned_agent_id: string | null;
  channel: string | null;
  source: string | null;
  last_seen_at: string | null;
}

export interface CampaignDetailData extends Campaign {
  analytics: CampaignAnalytics;
  leads: CampaignLead[];
}

export function useCampaignDetail(campaignId: string | null) {
  const [detail, setDetail] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!campaignId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/campaigns/${campaignId}`);
      if (!res.ok) throw new Error(await res.text());
      setDetail((await res.json()) as CampaignDetailData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { detail, loading, error, refetch };
}
