'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['G', 'I'], label: 'Go to Inbox' },
  { keys: ['G', 'C'], label: 'Go to Contacts' },
  { keys: ['G', 'P'], label: 'Go to Pipeline' },
  { keys: ['G', 'A'], label: 'Go to Attachments' },
  { keys: ['?'], label: 'Show this menu' },
];

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-xs text-gray-700">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
