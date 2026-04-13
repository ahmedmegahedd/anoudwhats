'use client';

import { formatSize, highlight, relativeTime } from './AttachmentCard';
import type { AttachmentRow } from './AttachmentCard';

interface Props {
  items: AttachmentRow[];
  query?: string;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onDownload: (a: AttachmentRow) => void;
  onDelete: (a: AttachmentRow) => void;
}

export default function AttachmentsList({
  items,
  query,
  selected,
  onToggleSelect,
  onToggleAll,
  onDownload,
  onDelete,
}: Props) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2.5 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
              />
            </th>
            <th className="px-2 py-2.5 w-8"></th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">File Name</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Contact</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Size</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Date</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((a) => {
            const isSelected = selected.has(a.id);
            return (
              <tr key={a.id} className={isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(a.id)}
                    className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                  />
                </td>
                <td className="px-2 py-3 text-center">
                  <TypeIcon fileType={a.file_type} mimeType={a.mime_type} />
                </td>
                <td className="px-3 py-3 text-xs text-gray-900 max-w-[260px]">
                  <p className="truncate font-medium" title={a.file_name ?? undefined}>
                    {highlight(a.file_name ?? 'Untitled', query)}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600 max-w-[180px]">
                  <p className="truncate">{a.contact?.name ?? 'Unknown'}</p>
                  {a.contact?.phone && (
                    <p className="text-[10px] text-gray-400 truncate">{a.contact.phone}</p>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {formatSize(a.file_size)}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {relativeTime(a.created_at)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => onDownload(a)}
                      className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-colors"
                      title="Download"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TypeIcon({
  fileType,
  mimeType,
}: {
  fileType: string | null;
  mimeType: string | null;
}) {
  if (fileType === 'image') return <span className="text-lg">📷</span>;
  if (fileType === 'video') return <span className="text-lg">🎥</span>;
  if (fileType === 'audio') return <span className="text-lg">🎵</span>;
  if (mimeType === 'application/pdf') return <span className="text-lg">📕</span>;
  return <span className="text-lg">📄</span>;
}
