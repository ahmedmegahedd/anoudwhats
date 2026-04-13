'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts:
 * - G then I → /inbox
 * - G then C → /crm/contacts
 * - G then P → /crm/pipeline
 * - G then A → /attachments
 * - ?         → toggle help modal
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const lastKeyRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
        return;
      }

      // ? — show help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      const now = Date.now();
      const last = lastKeyRef.current;

      // G prefix detection
      if (e.key === 'g' || e.key === 'G') {
        lastKeyRef.current = { key: 'g', at: now };
        return;
      }

      // Second key after G (within 1 second)
      if (last?.key === 'g' && now - last.at < 1000) {
        lastKeyRef.current = null;
        switch (e.key.toLowerCase()) {
          case 'i':
            e.preventDefault();
            router.push('/inbox');
            return;
          case 'c':
            e.preventDefault();
            router.push('/crm/contacts');
            return;
          case 'p':
            e.preventDefault();
            router.push('/crm/pipeline');
            return;
          case 'a':
            e.preventDefault();
            router.push('/attachments');
            return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [router]);

  return { showHelp, setShowHelp };
}
