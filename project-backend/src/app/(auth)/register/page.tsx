// src/app/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import styles from '../auth.module.css';

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

    // Cap score at 4 for our UI (0-4 scale)
    setStrength(Math.min(score, 4)); 
  }, [formData.password]);

  // Helper to get color class based on strength score
  const getStrengthColor = (index: number) => {
    if (strength === 0) return ''; // Empty
    if (strength <= 2) return index < strength ? styles.weak : '';
    if (strength === 3) return index < strength ? styles.medium : '';
    return index < strength ? styles.strong : '';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return '';
    if (strength <= 2) return <span style={{ color: '#ef4444' }}>Weak</span>;
    if (strength === 3) return <span style={{ color: '#eab308' }}>Medium</span>;
    return <span style={{ color: '#22c55e' }}>Strong</span>;
  };

  // 1. Handle Standard Registration
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

  // 2. Handle Google Login (Success from Popup)
  // This reuses the same backend logic as the Login page
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

      // Success! Save token and redirect
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Get started with CEiVoice</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Full Name */}
            <div className={styles.inputGroup}>
              <label htmlFor="full_name" className={styles.label}>Full Name</label>
              <input
                type="text"
                id="full_name"
                required
                className={styles.input}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                type="email"
                id="email"
                required
                className={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password with Toggle & Strength */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  className={styles.input}
                  style={{ width: '100%' }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Strength Bars */}
              {formData.password && (
                <div className={styles.strengthContainer}>
                  <div className={styles.strengthMeter}>
                    {[0, 1, 2, 3].map((index) => (
                      <div 
                        key={index} 
                        className={`${styles.strengthBar} ${getStrengthColor(index)}`} 
                      />
                    ))}
                  </div>
                  <div className={styles.strengthText}>
                    {getStrengthLabel()}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or sign up with</span>
          </div>

          {/* REPLACED: Custom Button -> Official Google Component */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login Failed')}
              theme="outline"
              size="large"
              width="340"
              text="signup_with" 
            />
          </div>

          <p className={styles.footer}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
