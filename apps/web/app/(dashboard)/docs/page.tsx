'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CategorySidebar from '@/components/docs/CategorySidebar';
import DocCard from '@/components/docs/DocCard';
import DocModal from '@/components/docs/DocModal';
import type { ReadyDoc } from '@anoud-job/types';

const API_URL = '/api';

export default function DocsPage() {
  const toast = useToast();
  const [docs, setDocs] = useState<ReadyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReadyDoc | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReadyDoc | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/ready-docs`);
      if (!res.ok) throw new Error(await res.text());
      setDocs((await res.json()) as ReadyDoc[]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load docs', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived categories with counts
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      if (d.category) map.set(d.category, (map.get(d.category) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [docs]);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  // Filtered list
  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (activeCategory && d.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = d.title.toLowerCase().includes(q);
        const inContent = d.content.toLowerCase().includes(q);
        if (!inTitle && !inContent) return false;
      }
      return true;
    });
  }, [docs, activeCategory, search]);

  function handleSaved(doc: ReadyDoc, mode: 'create' | 'edit') {
    if (mode === 'create') {
      setDocs((prev) => [doc, ...prev]);
    } else {
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    }
    setCreating(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_URL}/ready-docs/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast('Document deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <CategorySidebar
        categories={categories}
        totalCount={docs.length}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-semibold text-gray-900">Ready Documents</h1>
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
            >
              + New Document
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Pre-written texts ready to copy and paste into conversations
          </p>
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full max-w-md pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:bg-white"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
              <p className="text-sm text-gray-500">
                {search || activeCategory
                  ? 'No documents match your filters.'
                  : 'No documents yet. Click + New Document to create one.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onEdit={() => setEditing(doc)}
                  onDelete={() => setDeleteTarget(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {(creating || editing) && (
        <DocModal
          doc={editing}
          categories={categoryNames}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Document?"
        description="This document will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
    </div>
  );
}
