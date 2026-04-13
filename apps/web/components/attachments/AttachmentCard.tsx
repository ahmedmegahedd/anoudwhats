'use client';

import type { Attachment } from '@anoud-job/types';

export interface AttachmentRow extends Attachment {
  contact: { id: string; name: string | null; phone: string } | null;
}

interface Props {
  attachment: AttachmentRow;
  query?: string;
  onDownload: () => void;
  onDelete: () => void;
  onView?: () => void;
}

export default function AttachmentCard({
  attachment,
  query,
  onDownload,
  onDelete,
  onView,
}: Props) {
  const isImage = attachment.file_type === 'image';
  const snippet = query && attachment.extracted_text
    ? extractSnippet(attachment.extracted_text, query, 120)
    : null;

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
      {/* Preview */}
      <div className="relative h-40 bg-gray-50">
        <Preview attachment={attachment} />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {isImage && onView && (
            <IconButton onClick={onView} title="View">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </IconButton>
          )}
          <IconButton onClick={onDownload} title="Download">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </IconButton>
          <IconButton onClick={onDelete} title="Delete" danger>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3">
        <p
          className="text-xs font-semibold text-gray-900 truncate"
          title={attachment.file_name ?? undefined}
        >
          {highlight(attachment.file_name ?? 'Untitled', query)}
        </p>
        {snippet && (
          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 italic">
            …{highlight(snippet, query)}…
          </p>
        )}
        <p className="text-[11px] text-gray-500 mt-1 truncate">
          {attachment.contact?.name ?? 'Unknown'}
        </p>
        {attachment.contact?.phone && (
          <p className="text-[10px] text-gray-400 truncate">
            {attachment.contact.phone}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-400">
            {relativeTime(attachment.created_at)}
          </span>
          <span className="text-[10px] text-gray-400">
            {formatSize(attachment.file_size)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Preview dispatcher ─────────────────────────────────────────────────────

function Preview({ attachment }: { attachment: AttachmentRow }) {
  const { file_type, mime_type, media_url } = attachment;

  if (file_type === 'image' && media_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media_url}
        alt={attachment.file_name ?? ''}
        className="w-full h-full object-cover"
      />
    );
  }

  if (file_type === 'video') {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center relative">
        <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }

  if (file_type === 'audio') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <span className="text-4xl">🎵</span>
      </div>
    );
  }

  // Document
  const isPdf = mime_type === 'application/pdf';
  const isWord =
    mime_type === 'application/msword' ||
    mime_type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const color = isPdf
    ? 'text-red-600 bg-red-50'
    : isWord
    ? 'text-blue-600 bg-blue-50'
    : 'text-gray-500 bg-gray-100';

  return (
    <div className={`w-full h-full flex items-center justify-center ${color}`}>
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

// ── UI helpers ─────────────────────────────────────────────────────────────

function IconButton({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-md transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-white'
      }`}
    >
      {children}
    </button>
  );
}

export function highlight(text: string, query?: string): React.ReactNode {
  if (!query || !text) return text;
  const q = query.trim();
  if (!q) return text;
  const re = new RegExp(`(${escapeRegex(q)})`, 'ig');
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSnippet(text: string, query: string, len: number): string {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text.slice(0, len);
  const start = Math.max(0, idx - Math.floor((len - q.length) / 2));
  return text.slice(start, start + len);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
