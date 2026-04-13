'use client';

import { channelClass, formatEGP } from '@/components/crm/contacts/shared';

export interface CampaignListItem {
  id: string;
  name: string;
  channel: string | null;
  source: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  lead_count: number;
  won_count: number;
  total_value: number;
  created_by_name: string | null;
}

interface Props {
  campaign: CampaignListItem;
  active: boolean;
  onClick: () => void;
}

export default function CampaignCard({ campaign, active, onClick }: Props) {
  const status = getStatus(campaign.start_date, campaign.end_date);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${
        active
          ? 'border-[#25D366] bg-green-50'
          : 'border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-900 truncate flex-1">
          {campaign.name}
        </p>
        <StatusDot status={status} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {campaign.channel && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${channelClass(campaign.channel)}`}
          >
            {campaign.channel}
          </span>
        )}
        {campaign.source && (
          <span className="text-[10px] text-gray-500">{campaign.source}</span>
        )}
      </div>

      <p className="text-[11px] text-gray-500 mb-1">
        {formatDateRange(campaign.start_date, campaign.end_date)}
      </p>

      <p className="text-[11px] text-gray-600">
        <span className="font-semibold">{campaign.lead_count}</span> leads ·{' '}
        <span className="text-green-700 font-semibold">{campaign.won_count}</span>{' '}
        won · {formatEGP(campaign.total_value)}
      </p>
    </button>
  );
}

function StatusDot({ status }: { status: 'active' | 'upcoming' | 'ended' }) {
  const colors = {
    active: 'bg-green-500',
    upcoming: 'bg-blue-500',
    ended: 'bg-gray-400',
  };
  const labels = {
    active: 'Active',
    upcoming: 'Upcoming',
    ended: 'Ended',
  };
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`}
      title={labels[status]}
    />
  );
}

export function getStatus(
  start: string | null,
  end: string | null,
): 'active' | 'upcoming' | 'ended' {
  const now = new Date();
  if (start && new Date(start) > now) return 'upcoming';
  if (end && new Date(end) < now) return 'ended';
  return 'active';
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'No dates';
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Started ${fmt(start)}`;
  return `Ends ${fmt(end!)}`;
}
