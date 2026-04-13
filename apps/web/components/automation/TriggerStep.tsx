'use client';

import type { AutomationTriggerType } from '@anoud-job/types';

interface TriggerCard {
  type: AutomationTriggerType;
  icon: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
}

const TRIGGERS: TriggerCard[] = [
  { type: 'message_received', icon: '📨', title: 'Message Received', subtitle: 'Fires on every inbound message' },
  { type: 'conversation_opened', icon: '🆕', title: 'New Conversation', subtitle: 'Fires when a conversation is opened' },
  { type: 'conversation_resolved', icon: '✅', title: 'Conversation Resolved', subtitle: 'Fires when a conversation is resolved' },
  { type: 'keyword_match', icon: '🔑', title: 'Keyword Match', subtitle: 'Fires when message contains a keyword' },
  { type: 'no_reply_timeout', icon: '⏱️', title: 'No Reply Timeout', subtitle: 'Coming soon', disabled: true },
];

interface Props {
  value: AutomationTriggerType | null;
  keyword: string;
  onChange: (type: AutomationTriggerType) => void;
  onKeywordChange: (keyword: string) => void;
}

export default function TriggerStep({
  value,
  keyword,
  onChange,
  onKeywordChange,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        When this happens…
      </h2>
      <p className="text-sm text-gray-500 mb-5">Select a trigger for this rule.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TRIGGERS.map((t) => {
          const selected = value === t.type;
          return (
            <button
              key={t.type}
              type="button"
              disabled={t.disabled}
              onClick={() => !t.disabled && onChange(t.type)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                t.disabled
                  ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                  : selected
                  ? 'border-[#25D366] bg-green-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {selected && !t.disabled && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs">
                  ✓
                </div>
              )}
              <div className="text-2xl mb-1.5">{t.icon}</div>
              <p className="text-sm font-semibold text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
            </button>
          );
        })}
      </div>

      {value === 'keyword_match' && (
        <div className="mt-5 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <label className="block text-xs font-semibold text-orange-900 mb-1.5">
            Enter keyword
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="e.g. price, support, help…"
            className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
          <p className="text-[11px] text-orange-700 mt-1.5">
            Match is case-insensitive and uses substring matching.
          </p>
        </div>
      )}
    </div>
  );
}
