// src/app/(auth)/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const router = useRouter();
  
  // Form State
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '' 
  });
  
  // UI State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0); // 0 to 4

  // Calculate Password Strength on change
  useEffect(() => {
    const pwd = formData.password;
    let score = 0;
    if (!pwd) {
        setStrength(0);
        return;
    }

    if (pwd.length > 5) score++;           // Length Check
    if (pwd.length > 8) score++;           // Bonus Length
    if (/[A-Z]/.test(pwd)) score++;        // Uppercase
    if (/[0-9]/.test(pwd)) score++;        // Number
    if (/[^A-Za-z0-9]/.test(pwd)) score++; // Special Char

    // Cap score at 4
    setStrength(Math.min(score, 4)); 
  }, [formData.password]);

  // Helper to get color class based on strength score
  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-red-500';
    if (strength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return null;
    if (strength <= 2) return <span className="text-red-500 text-xs">Weak</span>;
    if (strength === 3) return <span className="text-yellow-500 text-xs">Medium</span>;
    return <span className="text-green-500 text-xs">Strong</span>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (strength < 2) {
       setError('Please choose a stronger password.');
       return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/login');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken: credentialResponse.credential 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google auth failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Create an account
        </h1>
        <p className="text-sm text-zinc-400">
          Enter your email below to create your account
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-900 text-red-300 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            
            {/* Full Name */}
            <div className="grid gap-2">
              <label htmlFor="full_name" className="text-sm font-medium leading-none text-zinc-200">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                required
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium leading-none text-zinc-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password with Toggle */}
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium leading-none text-zinc-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4 text-zinc-400 hover:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-zinc-400 hover:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength Bars */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1.5 w-full">
                    {[0, 1, 2, 3].map((index) => (
                      <div 
                        key={index} 
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          index < strength ? getStrengthColor() : 'bg-zinc-800'
                        }`} 
                      />
                    ))}
                  </div>
                  <div className="flex justify-end">
                    {getStrengthLabel()}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 shadow hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-2 text-zinc-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login Failed')}
              theme="filled_black"
              width="350"
              text="signup_with" 
              shape="rect"
            />
        </div>

        <p className="px-8 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="underline underline-offset-4 hover:text-white"
          >
            Sign in
          </Link>
        </p>
      </div>
    </GoogleOAuthProvider>
  );
}
