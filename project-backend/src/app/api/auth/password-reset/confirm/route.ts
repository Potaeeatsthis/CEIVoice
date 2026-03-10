// src/app/api/auth/password-reset/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, RESET_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Read token from the HttpOnly cookie (set by the verify endpoint)
    const token = request.cookies.get(RESET_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Reset session expired. Please request a new link.' },
        { status: 400 }
      );
    }

    // Validate token is still fresh in the database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('reset_token', token)
      .gt('reset_token_expiry', new Date().toISOString())
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Hash new password using shared helper (consistent with register)
    const hashedPassword = await hashPassword(newPassword);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Clear the reset cookie on success
    const response = NextResponse.json({ success: true, message: 'Password updated successfully' });
    response.cookies.set(RESET_COOKIE, '', { maxAge: 0, path: '/' });

    return response;
  } catch (error: any) {
    console.error('Reset Confirm Error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
