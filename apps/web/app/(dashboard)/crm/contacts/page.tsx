'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import StatsBar, { type ContactStatsData } from '@/components/crm/contacts/StatsBar';
import ChannelSourceChart from '@/components/crm/contacts/ChannelSourceChart';
import FilterPanel, {
  countActiveFilters,
} from '@/components/crm/contacts/FilterPanel';
import ContactsTable from '@/components/crm/contacts/ContactsTable';
import ContactsCards from '@/components/crm/contacts/ContactsCards';
import ContactDetailDrawer from '@/components/crm/contacts/ContactDetailDrawer';
import ContactModal from '@/components/crm/contacts/ContactModal';
import ImportContactsModal from '@/components/crm/contacts/ImportContactsModal';
import {
  useContacts,
  type ContactFilters,
  type ContactRowWithRelations,
} from '@/hooks/useContacts';
import type { Contact } from '@anoud-job/types';

const API_URL = '/api';

type View = 'table' | 'cards';

export default function ContactsPage() {
  const toast = useToast();
  const [view, setView] = useState<View>('table');
  const [filters, setFilters] = useState<ContactFilters>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ContactStatsData | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactRowWithRelations | null>(
    null,
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [knownChannels, setKnownChannels] = useState<string[]>([]);
  const [knownSources, setKnownSources] = useState<string[]>([]);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Merge search text into filters after debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: search.trim() || undefined }));
      setPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  const { contacts, total, loading, refetch } = useContacts(filters, page, limit);

  // Fetch channels/sources lists once (for modal suggestions)
  useEffect(() => {
    (async () => {
      try {
        const [chRes, srcRes] = await Promise.all([
          apiFetch(`${API_URL}/contacts/channels`),
          apiFetch(`${API_URL}/contacts/sources`),
        ]);
        if (chRes.ok) setKnownChannels((await chRes.json()) as string[]);
        if (srcRes.ok) setKnownSources((await srcRes.json()) as string[]);
      } catch {
        /* ignore */
      }
    })();
  }, [statsRefreshKey]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

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
      if (prev.size === contacts.length) return new Set();
      return new Set(contacts.map((c) => c.id));
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────
  async function exportCsv() {
    try {
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

      const res = await apiFetch(`${API_URL}/contacts/export?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast('CSV exported', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_URL}/contacts/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Contact deleted', 'success');
      setDeleteTarget(null);
      refetch();
      setStatsRefreshKey((k) => k + 1);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  async function confirmBulkDelete() {
    try {
      const res = await apiFetch(`${API_URL}/contacts/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { deleted } = (await res.json()) as { deleted: number };
      toast(`Deleted ${deleted} contacts`, 'success');
      setSelected(new Set());
      setBulkDeleteOpen(false);
      refetch();
      setStatsRefreshKey((k) => k + 1);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk delete failed', 'error');
    }
  }

  function handleSaved(saved: Contact) {
    setCreating(false);
    setEditing(null);
    refetch();
    setStatsRefreshKey((k) => k + 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar refreshKey={statsRefreshKey} onStatsLoaded={setStats} />

        {/* Insight panel */}
        <div className="mt-3">
          <ChannelSourceChart stats={stats} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
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
            placeholder="Search by name, phone, email, company…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Filter button */}
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
            onClick={() => setImportOpen(true)}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import CSV
          </button>

          <button
            onClick={exportCsv}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>

          <button
            onClick={() => setCreating(true)}
            className="px-3 py-2 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            + New Contact
          </button>

          {selected.size > 0 && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <span className="text-xs text-gray-600">{selected.size} selected</span>
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="px-3 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Selected
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : contacts.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {activeFilterCount > 0 || search
                ? 'No contacts match your filters.'
                : 'No contacts yet. New contacts appear automatically when someone messages via WhatsApp.'}
            </p>
          </div>
        ) : view === 'table' ? (
          <ContactsTable
            contacts={contacts}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onView={(c) => setViewingId(c.id)}
            onEdit={(c) => setEditing(c)}
            onDelete={(c) => setDeleteTarget(c)}
          />
        ) : (
          <ContactsCards
            contacts={contacts}
            onView={(c) => setViewingId(c.id)}
            onEdit={(c) => setEditing(c)}
            onDelete={(c) => setDeleteTarget(c)}
          />
        )}

        {/* Pagination */}
        {contacts.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
            <div>
              Showing {start}–{end} of {total.toLocaleString()} contacts
            </div>
            <div className="flex items-center gap-3">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <FilterPanel
        open={filterPanelOpen}
        filters={filters}
        onClose={() => setFilterPanelOpen(false)}
        onApply={(f) => {
          setFilters({ ...f, search: filters.search });
          setPage(1);
        }}
      />

      {/* Detail drawer */}
      {viewingId && (
        <ContactDetailDrawer
          contactId={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={(c) => setEditing(c)}
          onUpdated={() => {
            refetch();
            setStatsRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Create / Edit modal */}
      {(creating || editing) && (
        <ContactModal
          contact={editing}
          knownChannels={knownChannels}
          knownSources={knownSources}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportContactsModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            refetch();
            setStatsRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Delete confirms */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Contact?"
        description="This contact and all associated conversations will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} contacts?`}
        description="These contacts and their conversations will be permanently deleted."
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        confirmLabel="Delete All"
      />
    </div>
  );
}
