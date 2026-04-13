'use client';

import { useState } from 'react';
import RulesList from '@/components/automation/RulesList';
import LogsTab from '@/components/automation/LogsTab';

type Tab = 'rules' | 'logs';

export default function AutomationPage() {
  const [tab, setTab] = useState<Tab>('rules');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header with tabs ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Automation</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('rules')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'rules'
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Rules
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'logs'
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Logs
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'rules' ? <RulesList /> : <LogsTab />}
      </div>
    </div>
  );
}
