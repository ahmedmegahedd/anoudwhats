'use client';

import { useEffect, useState } from 'react';

export default function GeneralTab() {
  const [companyName, setCompanyName] = useState('Anoud Job');

  useEffect(() => {
    const stored = localStorage.getItem('company_name');
    if (stored) setCompanyName(stored);
  }, []);

  function save(value: string) {
    setCompanyName(value);
    localStorage.setItem('company_name', value);
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Company Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => save(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Saved to your browser
        </p>
      </div>
      <Row label="System Timezone" value="Africa/Cairo (UTC+2)" />
      <Row label="Language" value="English" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        {value}
      </p>
    </div>
  );
}
