'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Contact } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ContactRowWithRelations extends Contact {
  campaign: { id: string; name: string } | null;
  agent: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface ContactFilters {
  search?: string;
  channel?: string[];
  source?: string[];
  campaign_id?: string;
  pipeline_stage?: string[];
  assigned_agent_id?: string;
  tag?: string;
  date_from?: string;
  date_to?: string;
}

interface ContactsPage {
  data: ContactRowWithRelations[];
  total: number;
  page: number;
  limit: number;
}

export function useContacts(filters: ContactFilters, page: number, limit: number) {
  const [contacts, setContacts] = useState<ContactRowWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.channel?.length) params.set('channel', filters.channel.join(','));
    if (filters.source?.length) params.set('source', filters.source.join(','));
    if (filters.campaign_id) params.set('campaign_id', filters.campaign_id);
    if (filters.pipeline_stage?.length) {
      params.set('pipeline_stage', filters.pipeline_stage.join(','));
    }
    if (filters.assigned_agent_id) {
      params.set('assigned_agent_id', filters.assigned_agent_id);
    }
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return params.toString();
  }, [filters, page, limit]);

  const refetch = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/contacts?${buildQuery()}`);
      if (!res.ok) throw new Error(await res.text());
      const body = (await res.json()) as ContactsPage;
      if (reqIdRef.current !== reqId) return; // stale
      setContacts(body.data);
      setTotal(body.total);
    } catch (err) {
      if (reqIdRef.current !== reqId) return;
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      if (reqIdRef.current === reqId) setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { contacts, total, loading, error, refetch };
}
