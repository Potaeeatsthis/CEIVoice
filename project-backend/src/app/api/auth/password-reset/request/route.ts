// src/app/api/auth/password-reset/request/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';
import { ResetPasswordEmail } from '@/components/emails/ResetPasswordEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, full_name, provider')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If that email exists, we sent a reset link.',
      });
    }

    if (user.provider === 'google') {
      return NextResponse.json({
        success: true,
        message: 'If that email exists, we sent a reset link.',
      });
    }

    // Generate secure token (32 bytes = 64 hex chars) with 30-min expiry
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ reset_token: resetToken, reset_token_expiry: expiryDate })
      .eq('id', user.id);

    if (updateError) throw updateError;

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/password-reset/verify?token=${resetToken}`;

    await resend.emails.send({
      from: 'CEiVoice Support <support@ceivoice.com>',
      to: email,
      subject: 'Reset your password',
      react: ResetPasswordEmail({ link: resetLink, name: user.full_name }),
    });

    return NextResponse.json({ success: true, message: 'Reset email sent' });
  } catch (error: any) {
    console.error('Reset Request Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
