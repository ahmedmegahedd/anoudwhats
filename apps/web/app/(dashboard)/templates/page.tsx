'use client';

import { useState } from 'react';
import WaTemplatesTab from '@/components/templates/WaTemplatesTab';
import InternalTemplatesTab from '@/components/templates/InternalTemplatesTab';

type Tab = 'wa' | 'internal';

export default function TemplatesPage() {
  const [tab, setTab] = useState<Tab>('wa');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header with tabs ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Templates</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('wa')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'wa'
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            WhatsApp Templates
          </button>
          <button
            onClick={() => setTab('internal')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'internal'
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Internal Templates
          </button>
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'wa' ? <WaTemplatesTab /> : <InternalTemplatesTab />}
      </div>
    </div>
  );
}
