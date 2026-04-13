type Status = 'online' | 'away' | 'offline';

const STATUS_COLORS: Record<Status, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-400',
  offline: 'bg-gray-400',
};

const STATUS_LABELS: Record<Status, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
};

interface StatusDotProps {
  status: Status;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
};

export default function StatusDot({
  status,
  size = 'md',
  showLabel = false,
}: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${SIZE_CLASSES[size]} rounded-full ${STATUS_COLORS[status]} flex-shrink-0`}
      />
      {showLabel && (
        <span className="text-sm text-gray-600">{STATUS_LABELS[status]}</span>
      )}
    </span>
  );
}
