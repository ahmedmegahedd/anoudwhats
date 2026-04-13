'use client';

import { useState } from 'react';
import type { ReadyDoc } from '@anoud-job/types';

interface Props {
  doc: ReadyDoc;
  onEdit: () => void;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Greeting: 'bg-green-100 text-green-700',
  Pricing: 'bg-yellow-100 text-yellow-700',
  'After-sales': 'bg-blue-100 text-blue-700',
  Complaint: 'bg-red-100 text-red-700',
  Support: 'bg-purple-100 text-purple-700',
  Other: 'bg-gray-100 text-gray-600',
};

export default function DocCard({ doc, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(doc.content);
      } else {
        const ta = document.createElement('textarea');
        ta.value = doc.content;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const categoryClass =
    (doc.category && CATEGORY_COLORS[doc.category]) ?? 'bg-gray-100 text-gray-600';
  const flag = doc.language === 'ar' ? '🇪🇬' : '🇺🇸';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        {doc.category ? (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryClass}`}
          >
            {doc.category}
          </span>
        ) : (
          <span />
        )}
        <span className="text-base flex-shrink-0" title={doc.language.toUpperCase()}>
          {flag}
        </span>
      </div>

      <p className="text-base font-bold text-gray-900 leading-snug">{doc.title}</p>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-4 flex-1 whitespace-pre-wrap">
        {doc.content.slice(0, 140)}
        {doc.content.length > 140 ? '…' : ''}
      </p>

      <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
        <button
          onClick={copy}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            copied
              ? 'bg-[#25D366] text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
