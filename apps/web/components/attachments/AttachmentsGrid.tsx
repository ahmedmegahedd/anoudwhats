'use client';

import AttachmentCard from './AttachmentCard';
import type { AttachmentRow } from './AttachmentCard';

interface Props {
  items: AttachmentRow[];
  query?: string;
  onDownload: (a: AttachmentRow) => void;
  onDelete: (a: AttachmentRow) => void;
  onView: (index: number) => void;
}

export default function AttachmentsGrid({
  items,
  query,
  onDownload,
  onDelete,
  onView,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((a, i) => (
        <AttachmentCard
          key={a.id}
          attachment={a}
          query={query}
          onDownload={() => onDownload(a)}
          onDelete={() => onDelete(a)}
          onView={a.file_type === 'image' ? () => onView(i) : undefined}
        />
      ))}
    </div>
  );
}
