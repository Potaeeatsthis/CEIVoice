// src/app/api/auth/password-reset/request/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, provider')
      .ilike('email', email.trim())
      .single();

    console.log('[Password Reset] Lookup email:', email.toLowerCase());
    console.log('[Password Reset] User found:', user ? `id=${user.id}, provider=${user.provider}` : 'NO');
    if (userError) console.log('[Password Reset] DB error:', userError.message);

    // Don't reveal if email exists
    if (!user) {
      console.log('[Password Reset] No user found — returning fake success');
      return NextResponse.json({
        success: true,
        message: 'If that email exists, we sent a reset link.',
      });
    }

    // Google OAuth accounts can't reset password
    if (user.provider === 'google') {
      console.log('[Password Reset] Google OAuth user — skipping email');
      return NextResponse.json({
        error: 'This account uses Google sign-in. Please log in with Google instead.',
      }, { status: 400 });
    }

    // Generate secure token (32 bytes = 64 hex chars) with 30-min expiry
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ reset_token: resetToken, reset_token_expiry: expiryDate })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Fallback to localhost if env var is missing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/api/auth/password-reset/verify?token=${resetToken}`;

    try {
      // Use your sleek newly designed email template!
      await sendPasswordResetEmail(email, user.full_name || 'User', resetLink);
      console.log(`✉️ Password reset email sent to: ${email}`);
    } catch (emailError: any) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Reset email sent' });
  } catch (error: any) {
    console.error('Reset Request Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
