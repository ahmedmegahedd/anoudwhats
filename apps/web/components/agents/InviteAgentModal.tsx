'use client';

import { useEffect } from 'react';

interface InviteAgentModalProps {
  onClose: () => void;
}

const SUPABASE_DASHBOARD_URL = 'https://supabase.com/dashboard';

export default function InviteAgentModal({ onClose }: InviteAgentModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Invite Agent
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Agents are created via Supabase Auth
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            To add a new agent, go to your Supabase project dashboard and invite
            the user via{' '}
            <strong>Authentication → Users → Invite User</strong>.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            After the agent signs up and their profile row is created, they will
            appear in this table automatically.
          </p>

          {/* Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
            <strong>Note:</strong> In Part 10, this will be replaced with a
            built-in invite flow using Supabase Admin API.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <a
            href={SUPABASE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Open Supabase Dashboard ↗
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
