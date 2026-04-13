'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AttachmentsGrid from '@/components/attachments/AttachmentsGrid';
import AttachmentsList from '@/components/attachments/AttachmentsList';
import BulkActionBar from '@/components/attachments/BulkActionBar';
import ImageLightbox from '@/components/attachments/ImageLightbox';
import type { AttachmentRow } from '@/components/attachments/AttachmentCard';
import type { AttachmentFileType } from '@anoud-job/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type TypeFilter = 'ALL' | AttachmentFileType;
type ViewMode = 'grid' | 'list';

export default function AttachmentsPage() {
  const toast = useToast();
  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [fileType, setFileType] = useState<TypeFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AttachmentRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load (all or search) ─────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fileType !== 'ALL') params.set('file_type', fileType);
      if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.set('date_to', end.toISOString());
      }
      const res = await apiFetch(`${API_URL}/attachments?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as AttachmentRow[];
      setItems(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [fileType, dateFrom, dateTo, toast]);

  const runSearch = useCallback(
    async (q: string) => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (fileType !== 'ALL') params.set('file_type', fileType);
        const res = await apiFetch(`${API_URL}/attachments/search?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as AttachmentRow[];
        setItems(data);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Search failed', 'error');
      } finally {
        setSearching(false);
      }
    },
    [fileType, toast],
  );

  // Initial load when no search
  useEffect(() => {
    if (!query.trim()) {
      load();
    }
  }, [load, query]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    debounceRef.current = setTimeout(() => {
      runSearch(query.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Client-side contact filter
  const filtered = useMemo(() => {
    if (!contactFilter.trim()) return items;
    const q = contactFilter.toLowerCase();
    return items.filter((a) => {
      const name = a.contact?.name?.toLowerCase() ?? '';
      const phone = a.contact?.phone?.toLowerCase() ?? '';
      return name.includes(q) || phone.includes(q);
    });
  }, [items, contactFilter]);

  const imageItems = useMemo(
    () => filtered.filter((a) => a.file_type === 'image' && a.media_url),
    [filtered],
  );

  // ── Selection ────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((i) => i.id));
    });
  }

  // ── Download ─────────────────────────────────────────────────────────
  async function downloadOne(a: AttachmentRow) {
    try {
      const res = await apiFetch(`${API_URL}/attachments/${a.id}/download`);
      if (!res.ok) throw new Error(await res.text());
      const { url } = (await res.json()) as { url: string };
      window.open(url, '_blank');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Download failed', 'error');
    }
  }

  async function downloadBulk() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await apiFetch(`${API_URL}/attachments/bulk-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const signed = (await res.json()) as Array<{
        id: string;
        url: string;
        file_name: string | null;
      }>;

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      await Promise.all(
        signed.map(async (item) => {
          try {
            const fileRes = await fetch(item.url);
            const buf = await fileRes.arrayBuffer();
            zip.file(item.file_name ?? `${item.id}.bin`, buf);
          } catch (err) {
            console.error(`Failed to fetch ${item.id}:`, err);
          }
        }),
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attachments-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast(`Downloaded ${signed.length} files`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk download failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_URL}/attachments/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast('Attachment deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function confirmBulkDelete() {
    try {
      const ids = Array.from(selected);
      await Promise.all(
        ids.map((id) =>
          apiFetch(`${API_URL}/attachments/${id}`, { method: 'DELETE' }),
        ),
      );
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      toast(`Deleted ${ids.length} attachments`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk delete failed', 'error');
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Attachments</h1>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search through attachment contents..."
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          )}
          {searching && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
              Searching…
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {(['ALL', 'image', 'video', 'audio', 'document'] as TypeFilter[]).map(
              (opt) => (
                <button
                  key={opt}
                  onClick={() => setFileType(opt)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    fileType === opt
                      ? 'bg-[#25D366] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {fileTypeLabel(opt)}
                </button>
              ),
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <label className="text-[11px] text-gray-500">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>
          <input
            type="text"
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            placeholder="Filter by contact…"
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] flex-1 max-w-xs"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          query ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
              <p className="text-sm text-gray-500">
                No attachments found for &apos;{query}&apos;
              </p>
              <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
              <div className="text-4xl mb-2">📎</div>
              <p className="text-sm text-gray-500">
                No attachments yet. Files received via WhatsApp will appear here
                automatically.
              </p>
            </div>
          )
        ) : (
          <>
            {query && (
              <p className="text-xs text-gray-500 mb-3">
                {filtered.length} result{filtered.length === 1 ? '' : 's'} for{' '}
                <span className="font-medium text-gray-800">&apos;{query}&apos;</span>
              </p>
            )}
            {view === 'grid' ? (
              <AttachmentsGrid
                items={filtered}
                query={query}
                onDownload={downloadOne}
                onDelete={(a) => setDeleteTarget(a)}
                onView={(listIndex) => {
                  const item = filtered[listIndex];
                  const imgIndex = imageItems.findIndex((i) => i.id === item.id);
                  if (imgIndex >= 0) setLightboxIndex(imgIndex);
                }}
              />
            ) : (
              <AttachmentsList
                items={filtered}
                query={query}
                selected={selected}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
                onDownload={downloadOne}
                onDelete={(a) => setDeleteTarget(a)}
              />
            )}
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {view === 'list' && (
        <BulkActionBar
          count={selected.size}
          busy={bulkBusy}
          onClear={() => setSelected(new Set())}
          onDownloadAll={downloadBulk}
          onDeleteSelected={() => setBulkDeleteOpen(true)}
        />
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && imageItems.length > 0 && (
        <ImageLightbox
          items={imageItems}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Confirms */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Attachment?"
        description="This file will be permanently deleted from storage."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} attachments?`}
        description="These files will be permanently deleted from storage."
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        confirmLabel="Delete All"
      />
    </div>
  );
}

function fileTypeLabel(type: TypeFilter): string {
  switch (type) {
    case 'ALL':
      return 'All';
    case 'image':
      return '📷 Images';
    case 'video':
      return '🎥 Videos';
    case 'audio':
      return '🎵 Audio';
    case 'document':
      return '📄 Documents';
  }
}
