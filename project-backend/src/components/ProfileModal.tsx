// src/components/ProfileModal.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: string;
  userInitial: string;
  onProfileUpdate?: (name: string, avatarUrl: string | null) => void;
};

type Tab = 'profile' | 'security';

export default function ProfileModal({ isOpen, onClose, userId, userName, userRole, userInitial, onProfileUpdate }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Security fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/me');
      if (!res.ok) throw new Error('Failed to load profile');
      const data: UserProfile = await res.json();
      setProfile(data);
      setFullName(data.full_name || '');
      setDisplayName(data.display_name || '');
      setEmail(data.email || '');
      setAvatarPreview(data.avatar_url || null);
    } catch {
      toast.error('Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      setTab('profile');
    }
  }, [isOpen, fetchProfile]);

  // Trap escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          display_name: displayName || null,
          avatar_url: avatarPreview,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setProfile(data.user);
      
      // Notify parent to immediately update the UI
      const updatedName = data.user.full_name || data.user.display_name || userName;
      onProfileUpdate?.(updatedName, data.user.avatar_url);
      
      // Refresh Next.js server components seamlessly
      router.refresh();
      
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Admin', color: 'text-red-400 bg-red-950/40 border-red-900' },
    ASSIGNEE: { label: 'Assignee', color: 'text-amber-400 bg-amber-950/40 border-amber-900' },
    USER: { label: 'User', color: 'text-blue-400 bg-blue-950/40 border-blue-900' },
  };
  const roleStyle = roleLabel[userRole] ?? { label: userRole, color: 'text-zinc-400 bg-zinc-900 border-zinc-700' };

  const avatarInitial = fullName ? fullName.charAt(0).toUpperCase() : userInitial;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="relative px-6 pt-6 pb-5 border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-transparent">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-zinc-700 bg-zinc-800 flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">{avatarInitial}</span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white truncate">
                  {fullName || userName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.color}`}>
                    {roleStyle.label}
                  </span>
                  {profile?.email && (
                    <span className="text-xs text-zinc-500 truncate">{profile.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-5">
              {(['profile', 'security'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    tab === t
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {t === 'profile' ? 'Profile Info' : 'Security'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          {loading ? (
            <div className="flex items-center justify-center h-52">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
            </div>
          ) : (
            <div className="px-6 py-5 space-y-4">
              {tab === 'profile' && (
                <>
                  {/* Avatar upload */}
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-zinc-700 flex-shrink-0 flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-white">{avatarInitial}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 mb-1.5">Profile picture · Max 2MB</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
                        >
                          Upload
                        </button>
                        {avatarPreview && (
                          <button
                            onClick={() => setAvatarPreview(null)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors border border-zinc-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                  </div>

                  {/* Full name */}
                  <Field
                    label="Full Name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Your full name"
                    required
                  />

                  {/* Display name */}
                  <Field
                    label="Display Name"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="How you appear in the app (optional)"
                  />

                  {/* Email */}
                  <Field
                    label="Email Address"
                    value={email}
                    onChange={() => {}}
                    placeholder="your@email.com"
                    type="email"
                    disabled
                  />
                </>
              )}

              {tab === 'security' && (
                <>
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-400 leading-relaxed">
                    To change your password, enter your current password first. New password must be at least 8 characters.
                  </div>

                  <PasswordField
                    label="Current Password"
                    value={oldPassword}
                    onChange={setOldPassword}
                    show={showOld}
                    onToggle={() => setShowOld(!showOld)}
                    placeholder="Your current password"
                  />

                  <div className="w-full h-px bg-zinc-800" />

                  <PasswordField
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggle={() => setShowNew(!showNew)}
                    placeholder="Min. 8 characters"
                  />

                  <PasswordField
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
                    placeholder="Repeat new password"
                  />

                  {/* Strength indicator */}
                  {newPassword.length > 0 && (
                    <PasswordStrength password={newPassword} />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          {!loading && (
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={tab === 'profile' ? handleSaveProfile : handleSaveSecurity}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-white text-black rounded-lg hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-400 border-t-black animate-spin" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', required, disabled
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-900/50' : ''}`}
      />
    </div>
  );
}

function PasswordField({
  label, value, onChange, show, onToggle, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const levels = [
    { label: 'Weak', color: 'bg-red-500' },
    { label: 'Fair', color: 'bg-orange-500' },
    { label: 'Good', color: 'bg-amber-400' },
    { label: 'Strong', color: 'bg-emerald-500' },
  ];
  const level = levels[Math.max(0, score - 1)];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? level.color : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        score <= 1 ? 'text-red-400' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-amber-400' : 'text-emerald-400'
      }`}>
        {level.label} password
      </p>
    </div>
  );
}
