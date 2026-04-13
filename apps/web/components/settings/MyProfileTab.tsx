'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function MyProfileTab() {
  const toast = useToast();
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  async function saveProfile() {
    if (!profile) return;
    if (!fullName.trim()) {
      toast('Name is required', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiFetch(`${API_URL}/agents/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshProfile();
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function updatePassword() {
    if (!newPassword) {
      toast('New password is required', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast('Password updated', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  }

  if (!profile || !user) {
    return <p className="text-sm text-gray-400">Loading profile…</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name} size="lg" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
          <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={user.email ?? ''}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Role
          </label>
          <input
            type="text"
            value={profile.role}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 capitalize"
          />
        </div>
        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
        >
          {savingProfile ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      {/* Password change */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Change Password</p>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>
        <button
          onClick={updatePassword}
          disabled={updatingPassword}
          className="px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
        >
          {updatingPassword ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
