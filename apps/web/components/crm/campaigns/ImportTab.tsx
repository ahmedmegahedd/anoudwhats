'use client';

import { apiFetch } from '@/lib/api/client';

import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

const API_URL = '/api';

const KNOWN_COLUMNS = ['name', 'phone', 'email', 'company', 'deal_value'];

interface Props {
  campaignId: string;
  onImported: () => void;
}

interface PreviewData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  validRows: number;
  missingPhone: number;
  invalid: number;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function ImportTab({ campaignId, onImported }: Props) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  async function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      toast('File exceeds 5MB limit', 'error');
      return;
    }
    setFile(f);
    setResult(null);

    try {
      const XLSX = await import('xlsx');
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error('Empty file');
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const lowerHeaders = headers.map((h) => h.toLowerCase());

      let validRows = 0;
      let missingPhone = 0;
      let invalid = 0;
      for (const row of rows) {
        const phone = (row.phone ?? row.Phone) as string | undefined;
        const name = (row.name ?? row.Name) as string | undefined;
        if (!phone || !String(phone).trim()) {
          missingPhone++;
        } else if (!name || !String(name).trim()) {
          invalid++;
        } else {
          validRows++;
        }
      }

      setPreview({
        headers,
        rows: rows.slice(0, 5),
        totalRows: rows.length,
        validRows,
        missingPhone,
        invalid,
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to parse file', 'error');
      setFile(null);
      setPreview(null);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function downloadCsvTemplate() {
    const csv = 'name,phone,email,company,deal_value\nAhmed Mohamed,01012345678,ahmed@example.com,Acme Co,5000\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadXlsxTemplate() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'phone', 'email', 'company', 'deal_value'],
      ['Ahmed Mohamed', '01012345678', 'ahmed@example.com', 'Acme Co', 5000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads-template.xlsx');
  }

  async function runImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch(`${API_URL}/campaigns/${campaignId}/import`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ImportResult;
      setResult(data);
      toast(`Imported ${data.imported} leads`, 'success');
      onImported();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setShowErrors(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Download template:</span>
        <button
          onClick={downloadCsvTemplate}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          CSV Template
        </button>
        <button
          onClick={downloadXlsxTemplate}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Excel Template
        </button>
      </div>

      {/* Drop area */}
      {!preview && (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl py-12 text-center transition-colors ${
            dragActive
              ? 'border-[#25D366] bg-green-50'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="text-4xl mb-2">📤</div>
          <p className="text-sm font-medium text-gray-700">
            Drop your Excel or CSV file here
          </p>
          <p className="text-xs text-gray-500 mt-1">
            or click to browse (max 5MB, .xlsx or .csv)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="hidden"
          />
        </div>
      )}

      {/* Preview */}
      {preview && file && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB · {preview.totalRows} rows
              </p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              ✕ Change file
            </button>
          </div>

          {/* Validation */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-green-700">✓ {preview.validRows} valid</span>
            <span className="text-yellow-700">
              ⚠ {preview.missingPhone} missing phone
            </span>
            <span className="text-red-700">✗ {preview.invalid} invalid</span>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border border-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {preview.headers.map((h) => {
                    const isKnown = KNOWN_COLUMNS.includes(h.toLowerCase());
                    return (
                      <th
                        key={h}
                        className={`px-2 py-1.5 text-left font-semibold uppercase ${
                          isKnown
                            ? 'text-green-700 bg-green-50'
                            : 'text-yellow-700 bg-yellow-50'
                        }`}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map((h) => (
                      <td key={h} className="px-2 py-1 text-gray-700 truncate max-w-[140px]">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={runImport}
            disabled={importing || preview.validRows === 0}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
          >
            {importing
              ? 'Importing…'
              : `Import ${preview.validRows} Lead${preview.validRows === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Import Results</p>
          <div className="flex items-center gap-4 text-xs mb-2">
            <span className="text-green-700 font-medium">✓ {result.imported} imported</span>
            <span className="text-blue-700 font-medium">↺ {result.updated} updated</span>
            <span className="text-gray-600 font-medium">⊘ {result.skipped} skipped</span>
          </div>
          {result.errors.length > 0 && (
            <>
              <button
                onClick={() => setShowErrors((v) => !v)}
                className="text-[11px] text-red-600 hover:underline"
              >
                {showErrors ? 'Hide' : 'Show'} {result.errors.length} error
                {result.errors.length === 1 ? '' : 's'}
              </button>
              {showErrors && (
                <ul className="mt-2 text-[11px] text-red-700 space-y-0.5 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
