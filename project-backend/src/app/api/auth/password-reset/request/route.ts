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

    // 1. Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .single();

    if (!user) {
      // Security: Don't reveal if user exists or not. Return 200 regardless.
      return NextResponse.json({ success: true, message: 'If that email exists, we sent a link.' });
    }

    // 2. Generate Reset Token (32 chars hex) & Expiry (30 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date(Date.now() + 1800000).toISOString(); // + 30 minutes

    // 3. Save token to DB
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        reset_token: resetToken, 
        reset_token_expiry: expiryDate 
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // 4. Send Email via Resend
    // Construct the link: e.g., https://your-app.com/auth/reset-password?token=...
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    console.log('Generated Reset Link:', resetLink);

    await resend.emails.send({
      from: 'CEiVoice Support <support@ceivoice.com>',
      to: email,
      subject: 'Reset your password',
      react: ResetPasswordEmail({ link: resetLink, name: user.full_name })
    });

    return NextResponse.json({ success: true, message: 'Reset email sent' });

  } catch (error: any) {
    console.error('Reset Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
