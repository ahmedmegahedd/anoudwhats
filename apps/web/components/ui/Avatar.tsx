const PRESET_COLORS = [
  '#25D366',
  '#128C7E',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return PRESET_COLORS[Math.abs(hash) % PRESET_COLORS.length];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export default function Avatar({ name, size = 'md', color, className = '' }: AvatarProps) {
  const bgColor = color ?? getColorFromName(name);
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 select-none ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
