'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import Avatar from '@/components/ui/Avatar';

// ── Icons ─────────────────────────────────────────────────────────────────────

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function AgentsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function TeamsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function ContactsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm5 4h8M8 12h8M8 16h5" />
    </svg>
  );
}
function PipelineIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function CampaignsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
function TemplatesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6" />
    </svg>
  );
}
function AutomationIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function AttachmentsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}
function DocsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Nav definition ────────────────────────────────────────────────────────────

const navItems = [
  { href: '/inbox',         label: 'Inbox',       Icon: InboxIcon       },
  { href: '/agents',        label: 'Agents',      Icon: AgentsIcon      },
  { href: '/teams',         label: 'Teams',       Icon: TeamsIcon       },
  { href: '/crm/contacts',  label: 'Contacts',    Icon: ContactsIcon    },
  { href: '/crm/pipeline',  label: 'Pipeline',    Icon: PipelineIcon    },
  { href: '/crm/campaigns', label: 'Campaigns',   Icon: CampaignsIcon   },
  { href: '/templates',     label: 'Templates',   Icon: TemplatesIcon   },
  { href: '/automation',    label: 'Automation',  Icon: AutomationIcon  },
  { href: '/attachments',   label: 'Attachments', Icon: AttachmentsIcon },
  { href: '/docs',          label: 'Docs',        Icon: DocsIcon        },
  { href: '/settings',      label: 'Settings',    Icon: SettingsIcon    },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Load expand preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar_expanded');
    if (stored === 'true') setExpanded(true);
  }, []);

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem('sidebar_expanded', String(next));
  }

  const width = expanded ? 'w-56' : 'w-16';
  const displayName = profile?.full_name ?? 'User';

  const sidebarContent = (
    <aside
      className={`flex flex-col flex-shrink-0 py-3 gap-1 transition-all duration-200 ${width} h-full`}
      style={{ backgroundColor: '#111B21' }}
    >
      {/* Logo + collapse button */}
      <div
        className={`flex items-center mb-3 px-2 ${expanded ? 'justify-between' : 'justify-center'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm select-none">AJ</span>
          </div>
          {expanded && (
            <span className="text-white font-semibold text-sm">Anoud Job</span>
          )}
        </div>
        {expanded && (
          <button
            onClick={toggleExpand}
            className="text-gray-400 hover:text-white p-1 rounded"
            title="Collapse"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {!expanded && (
        <button
          onClick={toggleExpand}
          className="self-center text-gray-400 hover:text-white p-1 rounded mb-2"
          title="Expand"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 w-full px-2 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={label}
              onClick={onMobileClose}
              className={`group relative flex items-center gap-3 px-2.5 h-10 rounded-xl transition-colors flex-shrink-0 ${
                active
                  ? 'bg-[#25D366]/20 text-[#25D366]'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              } ${expanded ? '' : 'justify-center'}`}
            >
              <Icon active={active} />
              {expanded && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
              {!expanded && (
                <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile + Logout */}
      <div className="mt-2 px-2 relative">
        <button
          onClick={() => setProfileMenuOpen((v) => !v)}
          className={`w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-colors ${expanded ? '' : 'justify-center'}`}
          title={`${displayName}${profile ? ` (${profile.role})` : ''}`}
        >
          <Avatar name={displayName} size="md" />
          {expanded && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-white truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-gray-400 capitalize">
                {profile?.role ?? 'agent'}
              </p>
            </div>
          )}
        </button>

        {profileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setProfileMenuOpen(false)}
            />
            <div className="absolute bottom-full left-2 right-2 mb-2 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-gray-500 capitalize">
                  {profile?.role ?? 'agent'}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={() => setProfileMenuOpen(false)}
                className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                My Profile
              </Link>
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen">{sidebarContent}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
