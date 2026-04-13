'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useState } from 'react';
import type { WaTemplate } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useWaTemplates() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/templates/wa?status=APPROVED`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as WaTemplate[];
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/templates/wa?status=APPROVED`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as WaTemplate[];
        if (!cancelled) {
          setTemplates(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load templates');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { templates, loading, error, refetch };
}
