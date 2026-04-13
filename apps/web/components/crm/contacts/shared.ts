// Shared helpers for contact components

const TAG_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-yellow-100 text-yellow-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: 'bg-green-100 text-green-700',
  Facebook: 'bg-blue-100 text-blue-700',
  Instagram: 'bg-pink-100 text-pink-700',
  Manual: 'bg-gray-100 text-gray-600',
};

export function channelClass(channel: string | null | undefined): string {
  if (!channel) return 'bg-gray-100 text-gray-600';
  return CHANNEL_COLORS[channel] ?? 'bg-gray-100 text-gray-600';
}

const STAGE_COLORS: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600',
  Qualified: 'bg-blue-100 text-blue-700',
  Proposal: 'bg-yellow-100 text-yellow-700',
  Negotiation: 'bg-orange-100 text-orange-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
};

export function stageClass(stage: string | null | undefined): string {
  if (!stage) return 'bg-gray-100 text-gray-600';
  return STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600';
}

export const PIPELINE_STAGES = [
  'Lead',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
];

export function formatEGP(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `EGP ${value.toLocaleString()}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
