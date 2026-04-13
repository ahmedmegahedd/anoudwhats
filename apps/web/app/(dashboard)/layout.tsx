'use client';

import { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import Sidebar from '@/components/ui/Sidebar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import KeyboardShortcutsModal from '@/components/ui/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-lg bg-[#111B21] text-white flex items-center justify-center shadow-lg"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <KeyboardShortcutsModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardChrome>{children}</DashboardChrome>
      </ToastProvider>
    </AuthProvider>
  );
}
