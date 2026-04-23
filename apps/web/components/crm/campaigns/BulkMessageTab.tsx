'use client';

import { apiFetch } from '@/lib/api/client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useWaTemplates } from '@/hooks/useWaTemplates';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { extractBodyText } from '@/components/templates/WaTemplatesTab';
import type { CampaignLead } from '@/hooks/useCampaignDetail';

const API_URL = '/api';

const EMOJIS = [
  '😊', '👋', '✅', '🎉', '💬', '📞', '🙏', '⭐', '💡', '🔔',
  '📢', '🎁', '💰', '🏆', '❤️', '👍', '🚀', '⏰', '📱', '💎',
];

type Mode = 'text' | 'template';

interface Props {
  campaignId: string;
  leads: CampaignLead[];
}

interface JobStatus {
  jobId: string;
  status: 'processing' | 'done' | 'failed';
  sent: number;
  failed: number;
  total: number;
  errors: string[];
}

export default function BulkMessageTab({ campaignId, leads }: Props) {
  const toast = useToast();
  const { templates: waTemplates, loading: waLoading } = useWaTemplates();

  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateLang, setTemplateLang] = useState('en');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [showRecipients, setShowRecipients] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [job, setJob] = useState<JobStatus | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const eligible = useMemo(
    () => leads.filter((l) => l.last_seen_at !== null),
    [leads],
  );
  const skipped = leads.length - eligible.length;

  const selectedTemplate = waTemplates.find((t) => t.name === templateName);
  const templateBody = selectedTemplate ? extractBodyText(selectedTemplate.components) : '';
  const templateVarIndices = useMemo(() => {
    const set = new Set<string>();
    const re = /\{\{(\d+)\}\}/g;
    let match;
    while ((match = re.exec(templateBody)) !== null) set.add(match[1]);
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [templateBody]);

  const templatePreview = useMemo(() => {
    return templateBody.replace(/\{\{(\d+)\}\}/g, (_, i) => templateVars[i] ?? `{{${i}}}`);
  }, [templateBody, templateVars]);

  // Poll job status
  useEffect(() => {
    if (!job || job.status !== 'processing') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`${API_URL}/campaigns/jobs/${job.jobId}`);
        if (!res.ok) return;
        const data = (await res.json()) as JobStatus;
        setJob(data);
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job]);

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + emoji);
    } else {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setText((t) => t.slice(0, start) + emoji + t.slice(end));
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setEmojiOpen(false);
  }

  async function send() {
    if (mode === 'text' && !text.trim()) {
      toast('Enter a message', 'error');
      return;
    }
    if (mode === 'template' && !templateName) {
      toast('Select a template', 'error');
      return;
    }

    const payload: Record<string, unknown> = { type: mode };
    if (mode === 'text') {
      payload.message = text;
    } else {
      payload.templateName = templateName;
      payload.templateLanguage = templateLang;
      if (templateVarIndices.length > 0) {
        payload.templateComponents = [
          {
            type: 'body',
            parameters: templateVarIndices.map((i) => ({
              type: 'text',
              text: templateVars[i] ?? '',
            })),
          },
        ];
      }
    }

    try {
      const res = await apiFetch(`${API_URL}/campaigns/${campaignId}/bulk-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const { jobId } = (await res.json()) as { jobId: string };
      setJob({
        jobId,
        status: 'processing',
        sent: 0,
        failed: 0,
        total: eligible.length,
        errors: [],
      });
      toast('Bulk send started', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start', 'error');
    } finally {
      setConfirmOpen(false);
    }
  }

  const progressPct =
    job && job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <span className="text-base">⚠️</span>
        <p className="text-xs text-yellow-900">
          Only contacts who have previously messaged your WhatsApp number can
          receive bulk messages. Contacts without prior interaction will be
          skipped.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode('text')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'text' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          Text Message
        </button>
        <button
          onClick={() => setMode('template')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'template' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          WhatsApp Template
        </button>
      </div>

      {/* Text mode */}
      {mode === 'text' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Type your message…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                😊 Emoji
              </button>
              <span className="text-[11px] text-gray-400">{text.length} chars</span>
            </div>
            {emojiOpen && (
              <div className="absolute z-10 bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-10 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="w-7 h-7 hover:bg-gray-100 rounded text-base"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview bubble */}
          {text && (
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Preview:</p>
              <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-gray-800 max-w-sm whitespace-pre-wrap">
                {text}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template mode */}
      {mode === 'template' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Template
            </label>
            <select
              value={templateName}
              onChange={(e) => {
                const name = e.target.value;
                setTemplateName(name);
                const tpl = waTemplates.find((t) => t.name === name);
                if (tpl?.language) setTemplateLang(tpl.language);
                setTemplateVars({});
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">
                {waLoading ? 'Loading…' : 'Select a template…'}
              </option>
              {waTemplates.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">
                  Template Body
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {templateBody || <span className="italic text-gray-400">No body</span>}
                </div>
              </div>

              {templateVarIndices.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-500">Fill variables:</p>
                  {templateVarIndices.map((i) => (
                    <div key={i}>
                      <label className="block text-[10px] text-gray-500 mb-0.5 font-mono">
                        {`{{${i}}}`}
                      </label>
                      <input
                        type="text"
                        value={templateVars[i] ?? ''}
                        onChange={(e) =>
                          setTemplateVars((prev) => ({
                            ...prev,
                            [i]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="text-[11px] text-gray-500 mb-1">Preview:</p>
                <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-gray-800 max-w-sm whitespace-pre-wrap">
                  {templatePreview}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recipient summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-900">
          Will send to: <span className="font-bold">{eligible.length}</span> contacts
        </p>
        {skipped > 0 && (
          <p className="text-[11px] text-gray-500 mt-0.5">
            {skipped} contact{skipped === 1 ? '' : 's'} will be skipped (no prior
            WhatsApp interaction)
          </p>
        )}
        {eligible.length > 0 && (
          <button
            onClick={() => setShowRecipients((v) => !v)}
            className="text-[11px] text-[#25D366] hover:underline mt-1"
          >
            {showRecipients ? 'Hide' : 'Show'} list
          </button>
        )}
        {showRecipients && (
          <ul className="mt-2 text-[11px] text-gray-600 max-h-40 overflow-y-auto space-y-0.5">
            {eligible.map((r) => (
              <li key={r.id}>
                {r.name ?? 'Unknown'} — {r.phone}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Progress */}
      {job && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">
              {job.status === 'processing' && `Sending... ${job.sent + job.failed}/${job.total}`}
              {job.status === 'done' &&
                `✓ ${job.sent} sent successfully${job.failed > 0 ? ` · ✗ ${job.failed} failed` : ''}`}
              {job.status === 'failed' && '✗ Job failed'}
            </p>
            <span className="text-xs text-gray-500">{progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#25D366] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {job.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-red-700 mb-1">
                Errors ({job.errors.length}):
              </p>
              <ul className="text-[11px] text-red-600 max-h-32 overflow-y-auto space-y-0.5">
                {job.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={
          eligible.length === 0 ||
          (mode === 'text' && !text.trim()) ||
          (mode === 'template' && !templateName) ||
          job?.status === 'processing'
        }
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors"
      >
        {job?.status === 'processing'
          ? 'Sending…'
          : `Send to ${eligible.length} Contact${eligible.length === 1 ? '' : 's'}`}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Send Bulk Message?"
        description={`You are about to send a WhatsApp message to ${eligible.length} contacts. This cannot be undone.`}
        onConfirm={send}
        onCancel={() => setConfirmOpen(false)}
        confirmLabel="Send"
        confirmVariant="primary"
      />
    </div>
  );
}
