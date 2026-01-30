// src/app/api/auth/password-reset/confirm/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    // 1. Find user with this token AND check if token is not expired
    const now = new Date().toISOString();
    
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('reset_token', token)
      .gt('reset_token_expiry', now) // Ensure expiry is Greater Than now
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // 2. Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Update User: Set new password and clear the reset token
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: hashedPassword,
        reset_token: null,       // Clear token so it can't be reused
        reset_token_expiry: null
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (error: any) {
    console.error('Reset Confirm Error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
