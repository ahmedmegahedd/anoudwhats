// Shared pipeline constants + helpers

export interface StageConfig {
  name: string;
  color: string;
  probability: number;
}

export const PIPELINE_STAGES: StageConfig[] = [
  { name: 'Lead', color: '#6B7280', probability: 10 },
  { name: 'Qualified', color: '#3B82F6', probability: 30 },
  { name: 'Proposal', color: '#F59E0B', probability: 50 },
  { name: 'Negotiation', color: '#F97316', probability: 70 },
  { name: 'Won', color: '#22C55E', probability: 100 },
  { name: 'Lost', color: '#EF4444', probability: 0 },
];

export function stageColor(name: string): string {
  return PIPELINE_STAGES.find((s) => s.name === name)?.color ?? '#6B7280';
}

const EGP_FORMATTER = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  maximumFractionDigits: 0,
});

export function formatEGP(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'No value';
  return EGP_FORMATTER.format(value);
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
