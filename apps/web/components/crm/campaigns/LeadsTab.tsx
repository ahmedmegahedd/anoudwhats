'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import {
  channelClass,
  formatEGP,
  relativeTime,
  stageClass,
} from '@/components/crm/contacts/shared';
import type { CampaignLead } from '@/hooks/useCampaignDetail';

const API_URL = '/api';

interface Props {
  campaignId: string;
  leads: CampaignLead[];
}

export default function LeadsTab({ campaignId, leads }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const name = l.name?.toLowerCase() ?? '';
      return name.includes(q) || l.phone.includes(q);
    });
  }, [leads, search]);

  function exportCsv() {
    const url = `${API_URL}/contacts/export?campaign_id=${campaignId}`;
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
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
            placeholder="Search leads…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:bg-white"
          />
        </div>
        <button
          onClick={exportCsv}
          className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center">
          <p className="text-sm text-gray-500">
            {search ? 'No leads match your search.' : 'No leads in this campaign yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Stage</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Deal</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Channel</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Last Seen</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={lead.name ?? lead.phone} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate max-w-[160px]">
                            {lead.name ?? 'Unknown'}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageClass(lead.pipeline_stage)}`}
                      >
                        {lead.pipeline_stage}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                      {formatEGP(lead.deal_value)}
                    </td>
                    <td className="px-3 py-2.5">
                      {lead.channel ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelClass(lead.channel)}`}
                        >
                          {lead.channel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {relativeTime(lead.last_seen_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => router.push(`/crm/contacts?contact=${lead.id}`)}
                        className="text-[11px] text-[#25D366] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
