'use client';

import Avatar from '@/components/ui/Avatar';
import { channelClass } from '@/components/crm/contacts/shared';
import { formatEGP } from './shared';
import type { DealCard as DealCardType } from '@/hooks/usePipeline';

interface Props {
  deal: DealCardType;
}

export default function DealCardOverlay({ deal }: Props) {
  return (
    <div className="bg-white border-2 border-[#25D366] rounded-xl p-3 shadow-2xl scale-105 rotate-1 w-[280px] cursor-grabbing">
      <p className="text-sm font-semibold text-gray-900 truncate">
        {deal.name ?? 'Unknown'}
      </p>
      <p className="text-[11px] text-gray-500 truncate">{deal.phone}</p>

      {deal.channel && (
        <div className="mt-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelClass(deal.channel)}`}
          >
            {deal.channel}
          </span>
        </div>
      )}

      <p
        className={`text-sm font-bold mt-2 ${
          deal.deal_value !== null && deal.deal_value !== undefined
            ? 'text-[#128C7E]'
            : 'text-gray-400'
        }`}
      >
        {formatEGP(deal.deal_value)}
      </p>

      {deal.agent && (
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar name={deal.agent.full_name} size="sm" />
          <span className="text-[11px] text-gray-700 truncate">
            {deal.agent.full_name}
          </span>
        </div>
      )}
    </div>
  );
}
