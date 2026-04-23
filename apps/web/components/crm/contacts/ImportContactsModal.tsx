'use client';

import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; phone: string | null; reason: string }>;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportContactsModal({ onClose, onImported }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  function downloadTemplate() {
    const csv =
      'phone,name,email,company,tags,source\n' +
      '+201000000000,Jane Doe,jane@example.com,Acme,vip;lead,Website\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch('/api/contacts/import', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (data.created > 0) {
        toast(`Imported ${data.created} contact${data.created === 1 ? '' : 's'}`, 'success');
        onImported();
      } else if (data.errors.length > 0) {
        toast('Import finished with errors', 'error');
      } else {
        toast('No new contacts created', 'info');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Import Contacts</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-gray-600">
            Upload a CSV file. Required column: <code className="px-1 bg-gray-100 rounded">phone</code>.
            Optional: <code className="px-1 bg-gray-100 rounded">name, email, company, tags, source, pipeline_stage</code>.
            Tags can be separated by <code>;</code> or <code>,</code>.
          </p>

          <button
            onClick={downloadTemplate}
            className="text-xs text-[#25D366] hover:underline"
          >
            Download CSV template
          </button>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 5 * 1024 * 1024) {
                  toast('File exceeds 5MB limit', 'error');
                  return;
                }
                setFile(f);
                setResult(null);
              }}
              className="w-full text-xs"
            />
            {file && (
              <p className="text-[11px] text-gray-500 mt-1">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-gray-900 mb-1">Result</p>
              <div className="flex gap-4">
                <span className="text-green-700">✓ {result.created} created</span>
                <span className="text-gray-600">⊘ {result.skipped} skipped</span>
                <span className="text-red-700">✗ {result.errors.length} errors</span>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowErrors((v) => !v)}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    {showErrors ? 'Hide' : 'Show'} errors
                  </button>
                  {showErrors && (
                    <ul className="mt-1 text-[11px] text-red-700 space-y-0.5 max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 50).map((e, i) => (
                        <li key={i}>
                          Row {e.row}: {e.phone ?? '(no phone)'} — {e.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={runImport}
            disabled={!file || busy}
            className="px-3 py-2 text-xs font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
          >
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
