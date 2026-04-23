'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

const API_URL = '/api';

interface ConnectionResult {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}

export default function WhatsAppTab() {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<ConnectionResult | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = createClient();
        const { data } = await db
          .from('wa_templates')
          .select('last_synced_at')
          .order('last_synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.last_synced_at) setLastSync(data.last_synced_at as string);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function testConnection() {
    setTesting(true);
    try {
      const res = await apiFetch(`${API_URL}/settings/test-connection`);
      const data = (await res.json()) as ConnectionResult;
      setConnection(data);
    } catch (err) {
      setConnection({
        connected: false,
        error: err instanceof Error ? err.message : 'Failed',
      });
    } finally {
      setTesting(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await apiFetch(`${API_URL}/templates/wa/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { synced: number; total: number };
      toast(`Synced ${data.synced} templates`, 'success');
      setLastSync(new Date().toISOString());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  const phoneNumberId = process.env.NEXT_PUBLIC_META_PHONE_NUMBER_ID ?? '';
  const webhookUrl = origin
    ? `${origin}${API_URL}/webhook/whatsapp`
    : `${API_URL}/webhook/whatsapp`;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Configuration */}
      <Section title="Configuration">
        <Row label="Phone Number ID" value={mask(phoneNumberId) || '— set on backend —'} />
        <Row label="WABA ID" value="— set on backend —" />
        <Row label="Webhook URL" value={webhookUrl} copyable />
        <Row label="Webhook Verify Token" value="••••••••" copyable />
      </Section>

      {/* Connection */}
      <Section title="Connection Status">
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-3 py-2 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
        >
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
        {connection && (
          <div
            className={`mt-3 p-3 rounded-lg border text-sm ${
              connection.connected
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {connection.connected
              ? `✅ Connected — Phone number ${connection.phoneNumber} is active`
              : `❌ Connection failed — ${connection.error ?? 'Check your credentials'}`}
          </div>
        )}
      </Section>

      {/* Auto-sync */}
      <Section title="Template Auto-sync">
        <p className="text-xs text-gray-600 mb-1">
          Active — runs daily at midnight
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Last synced:{' '}
          {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
        </p>
        <button
          onClick={syncNow}
          disabled={syncing}
          className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-[11px] font-medium text-gray-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-2 py-1.5 bg-gray-50 text-xs text-gray-800 rounded border border-gray-200 truncate">
          {value}
        </code>
        {copyable && (
          <button
            onClick={copy}
            className="px-2 py-1 text-[10px] font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
}
