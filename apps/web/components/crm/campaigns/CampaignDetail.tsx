'use client';

import { apiFetch } from '@/lib/api/client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatEGP } from '@/components/crm/contacts/shared';
import { stageColor } from '@/components/crm/pipeline/shared';
import LeadsTab from './LeadsTab';
import ImportTab from './ImportTab';
import BulkMessageTab from './BulkMessageTab';
import { formatDateRange, getStatus } from './CampaignCard';
import type { Campaign } from '@anoud-job/types';
import type { CampaignDetailData } from '@/hooks/useCampaignDetail';

const API_URL = '/api';

type Tab = 'leads' | 'import' | 'bulk';

interface Props {
  detail: CampaignDetailData;
  onEdit: (c: Campaign) => void;
  onDeleted: () => void;
  onRefresh: () => void;
}

export default function CampaignDetail({
  detail,
  onEdit,
  onDeleted,
  onRefresh,
}: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('leads');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const status = getStatus(detail.start_date, detail.end_date);

  async function confirmDelete() {
    try {
      const res = await apiFetch(`${API_URL}/campaigns/${detail.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Campaign deleted', 'success');
      setDeleteOpen(false);
      onDeleted();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  const a = detail.analytics;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {detail.name}
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : status === 'upcoming'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formatDateRange(detail.start_date, detail.end_date)}
              {detail.budget && ` · Budget: ${formatEGP(detail.budget)}`}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(detail)}
              className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Analytics cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatCard label="Total Leads" value={a.totalLeads.toLocaleString()} />
          <StatCard
            label="Conversion Rate"
            value={`${a.conversionRate.toFixed(1)}%`}
          />
          <StatCard label="Pipeline Value" value={formatEGP(a.totalValue)} />
          <StatCard
            label="Won Value"
            value={formatEGP(a.wonValue)}
            tone="green"
          />
        </div>

        {/* Stage breakdown */}
        {a.totalLeads > 0 && (
          <div className="mt-4">
            <div className="h-3 rounded-full overflow-hidden flex">
              {a.byStage.map((s) => {
                if (s.count === 0) return null;
                const width = (s.count / a.totalLeads) * 100;
                return (
                  <div
                    key={s.stage}
                    style={{
                      width: `${width}%`,
                      backgroundColor: stageColor(s.stage),
                    }}
                    title={`${s.stage}: ${s.count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {a.byStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-1 text-[11px]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stageColor(s.stage) }}
                  />
                  <span className="text-gray-600">
                    {s.stage} ({s.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6">
        <TabButton active={tab === 'leads'} onClick={() => setTab('leads')}>
          Leads
        </TabButton>
        <TabButton active={tab === 'import'} onClick={() => setTab('import')}>
          Import
        </TabButton>
        <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')}>
          Bulk Message
        </TabButton>
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'leads' && (
          <LeadsTab campaignId={detail.id} leads={detail.leads} />
        )}
        {tab === 'import' && (
          <ImportTab campaignId={detail.id} onImported={onRefresh} />
        )}
        {tab === 'bulk' && (
          <BulkMessageTab campaignId={detail.id} leads={detail.leads} />
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Campaign?"
        description="This campaign will be deleted. Contacts will stay but lose their campaign association."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        confirmLabel="Delete"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green';
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-base font-bold mt-0.5 ${
          tone === 'green' ? 'text-[#128C7E]' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active
          ? 'border-[#25D366] text-[#25D366]'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}
