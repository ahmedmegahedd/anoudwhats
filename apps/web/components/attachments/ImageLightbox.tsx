'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AttachmentRow } from './AttachmentCard';

interface Props {
  items: AttachmentRow[];
  startIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ items, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  function prev() {
    setIndex((i) => (i > 0 ? i - 1 : items.length - 1));
  }
  function next() {
    setIndex((i) => (i < items.length - 1 ? i + 1 : 0));
  }

  if (!mounted) return null;
  const current = items[index];
  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev */}
      {items.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Previous"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next */}
      {items.length > 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Next"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image */}
      {current.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.media_url}
          alt={current.file_name ?? 'Attachment'}
          className="max-w-[90vw] max-h-[80vh] object-contain"
        />
      )}

      {/* Footer info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
        <span className="font-medium">{current.file_name}</span>
        {current.contact?.name && (
          <>
            {' · '}
            <span className="text-gray-300">{current.contact.name}</span>
          </>
        )}
        {' · '}
        <span className="text-gray-400">
          {new Date(current.created_at).toLocaleDateString()}
        </span>
        {items.length > 1 && (
          <>
            {' · '}
            <span className="text-gray-400">
              {index + 1} / {items.length}
            </span>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
