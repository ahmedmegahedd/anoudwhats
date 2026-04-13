'use client';

import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Anoud Job`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
