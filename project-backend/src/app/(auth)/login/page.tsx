// src/app/(auth)/login/page.tsx

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(errorParam ?? '');
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role: string) => {
    if (role === 'ADMIN') router.push('/admin/tickets');
    else if (role === 'ASSIGNEE') router.push('/assignee/tickets');
    else router.push('/tickets');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      redirectByRole(data.user.role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google auth failed');

      // New Google users must set a password before entering the app
      if (data.isNewUser) {
        router.push('/setup-password');
        return;
      }

      redirectByRole(data.user.role);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
        <p className="text-sm text-zinc-400">Enter your credentials below to sign in</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-200">Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-zinc-200">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
		placeholder="Enter Password"
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black shadow hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            theme="filled_black"
            width="350"
            text="continue_with"
            shape="rect"
            locale="en"
          />
        </div>
      </div>

      <p className="px-8 text-center text-sm text-zinc-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="underline underline-offset-4 hover:text-white font-medium">
          Sign up
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </GoogleOAuthProvider>
  );
}
