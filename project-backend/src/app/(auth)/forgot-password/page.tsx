// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setStatus('success');
      setMessage("If an account exists with that email, we've sent a reset link. Check your inbox.");
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  if (status === 'success') {
    return (
      <>
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Check your email</h1>
        </div>

        <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-md text-sm">
          {message}
        </div>

        <p className="text-center text-sm text-zinc-400">
          <Link href="/" className="underline underline-offset-4 hover:text-white font-medium">
            ← Back to login
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Reset your password</h1>
        <p className="text-sm text-zinc-400">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {status === 'error' && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-md text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black shadow hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-zinc-400">
        <Link href="/" className="underline underline-offset-4 hover:text-white font-medium">
          ← Back to login
        </Link>
      </p>
    </>
  );
}
