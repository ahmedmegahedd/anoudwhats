'use client';

import { useState } from 'react';
import GeneralTab from '@/components/settings/GeneralTab';
import WhatsAppTab from '@/components/settings/WhatsAppTab';
import BusinessHoursTab from '@/components/settings/BusinessHoursTab';
import MyProfileTab from '@/components/settings/MyProfileTab';

type Tab = 'general' | 'whatsapp' | 'hours' | 'profile' | 'team' | 'notifications';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
  disabled?: boolean;
}

const NAV: NavItem[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'hours', label: 'Business Hours', icon: '🕐' },
  { id: 'profile', label: 'My Profile', icon: '👤' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', disabled: true },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="flex h-full bg-gray-50">
      {/* Settings nav */}
      <aside className="w-[200px] flex-shrink-0 bg-white border-r border-gray-200 p-4">
        <h1 className="text-base font-semibold text-gray-900 mb-4 px-2">Settings</h1>
        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setTab(item.id)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : tab === item.id
                  ? 'bg-[#25D366]/10 text-[#25D366] font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.disabled && (
                <span className="ml-auto text-[9px] text-gray-400">soon</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'general' && <GeneralTab />}
        {tab === 'whatsapp' && <WhatsAppTab />}
        {tab === 'hours' && <BusinessHoursTab />}
        {tab === 'profile' && <MyProfileTab />}
        {tab === 'team' && (
          <p className="text-sm text-gray-500">
            Team management is on the dedicated{' '}
            <a href="/teams" className="text-[#25D366] hover:underline">
              Teams page
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
