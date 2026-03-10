// src/app/(auth)/setup-password/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PASSWORD_RULES = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',   test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',             test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SetupPasswordPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ruleResults, setRuleResults] = useState<boolean[]>([false, false, false, false]);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Read the user's email + name from the JWT via a lightweight /api/me call
  const [userEmail, setUserEmail] = useState('');
  const [avatarInitial, setAvatarInitial] = useState('');

  useEffect(() => {
    fetch('/api/users/me')
      .then(r => r.json())
      .then(data => {
        if (data?.email) setUserEmail(data.email);
        if (data?.full_name) {
          setAvatarInitial(data.full_name.charAt(0).toUpperCase());
        } else if (data?.email) {
          setAvatarInitial(data.email.charAt(0).toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setRuleResults(PASSWORD_RULES.map(r => r.test(password)));
  }, [password]);

  const strength = ruleResults.filter(Boolean).length;
  const allPassed = strength === 4;

  const strengthColor =
    strength <= 1 ? 'bg-red-500'
    : strength === 2 ? 'bg-orange-500'
    : strength === 3 ? 'bg-yellow-500'
    : 'bg-green-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }

    if (!allPassed) {
      setError('Password does not meet all requirements.');
      setPasswordFocused(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, displayName: displayName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete setup');

      router.push('/tickets');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    // Full-page centering — sits outside the default auth layout card
    <div className="flex flex-col items-center gap-6 w-full">

      {/* Avatar initial */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-2xl font-semibold text-zinc-200 select-none">
        {avatarInitial || '?'}
      </div>

      {/* Heading */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">One last step</h1>
        <p className="text-sm text-zinc-400 max-w-xs">
          Set up your display name and password to finish creating your account.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="w-full bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="grid gap-4">

          {/* Display Name */}
          <div className="grid gap-2">
            <label htmlFor="display_name" className="text-sm font-medium text-zinc-200">
              Display Name
            </label>
            <input
              id="display_name"
              type="text"
              required
              autoComplete="nickname"
              placeholder="e.g. john_doe"
              className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-200">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1 h-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        i < strength ? strengthColor : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>

                {/* Requirements checklist */}
                {passwordFocused && (
                  <ul className="space-y-1">
                    {PASSWORD_RULES.map((rule, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        {ruleResults[i] ? (
                          <svg className="h-3.5 w-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={ruleResults[i] ? 'text-zinc-400' : 'text-zinc-500'}>
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="grid gap-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-zinc-200">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`flex h-10 w-full rounded-lg border px-3 py-2 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 bg-zinc-900 ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-700 focus-visible:ring-red-600'
                    : 'border-zinc-700 focus-visible:ring-zinc-400'
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !allPassed || password !== confirmPassword || !displayName.trim()}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 shadow hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {loading ? 'Setting up…' : 'Complete Setup'}
          </button>
        </div>
      </form>

      {/* Signed-in email footer */}
      {userEmail && (
        <p className="text-xs text-zinc-500 text-center">
          Signed in as{' '}
          <span className="font-medium text-zinc-300">{userEmail}</span>
        </p>
      )}

      {/* Skip */}
      <p className="text-xs text-zinc-600 text-center">
        <button
          className="underline underline-offset-4 hover:text-zinc-400 transition-colors"
          onClick={() => router.push('/tickets')}
        >
          Skip for now
        </button>
      </p>
    </div>
  );
}
