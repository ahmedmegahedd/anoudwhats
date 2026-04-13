'use client';

interface Props {
  count: number;
  onDownloadAll: () => void;
  onDeleteSelected: () => void;
  onClear: () => void;
  busy?: boolean;
}

export default function BulkActionBar({
  count,
  onDownloadAll,
  onDeleteSelected,
  onClear,
  busy,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3">
      <button
        onClick={onClear}
        className="text-xs text-gray-300 hover:text-white transition-colors"
      >
        ✕
      </button>
      <span className="text-sm font-medium">
        {count} selected
      </span>
      <div className="w-px h-5 bg-gray-700" />
      <button
        onClick={onDownloadAll}
        disabled={busy}
        className="text-sm font-medium text-[#25D366] hover:text-green-400 disabled:opacity-50 transition-colors"
      >
        {busy ? 'Preparing…' : 'Download All'}
      </button>
      <button
        onClick={onDeleteSelected}
        className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
      >
        Delete Selected
      </button>
    </div>
  );
}
