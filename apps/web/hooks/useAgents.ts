'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentWithTeam } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useAgents() {
  const [agents, setAgents] = useState<AgentWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/agents`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as AgentWithTeam[];
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/agents`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as AgentWithTeam[];
        if (!cancelled) {
          setAgents(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load agents');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { agents, loading, error, refetch };
}
