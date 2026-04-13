'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import type { Contact } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface DealCard extends Contact {
  agent: { id: string; full_name: string; avatar_url: string | null } | null;
  last_message: { content: string | null; created_at: string } | null;
}

export interface StageStat {
  stage: string;
  count: number;
  totalValue: number;
}

export interface PipelineFilters {
  campaign_id?: string;
  agent_id?: string;
  channel?: string;
  source?: string;
}

interface BoardData {
  stages: Record<string, DealCard[]>;
  stats: StageStat[];
}

export function usePipeline(filters: PipelineFilters) {
  const [stages, setStages] = useState<Record<string, DealCard[]>>({});
  const [stats, setStats] = useState<StageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.campaign_id) params.set('campaign_id', filters.campaign_id);
    if (filters.agent_id) params.set('agent_id', filters.agent_id);
    if (filters.channel) params.set('channel', filters.channel);
    if (filters.source) params.set('source', filters.source);
    return params.toString();
  }, [filters.campaign_id, filters.agent_id, filters.channel, filters.source]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/pipeline/board?${buildQuery()}`);
      if (!res.ok) throw new Error(await res.text());
      const body = (await res.json()) as BoardData;
      setStages(body.stages);
      setStats(body.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stages, setStages, stats, loading, error, refetch };
}
