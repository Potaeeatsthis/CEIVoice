// src/app/api/auth/register/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { Resend } from 'resend';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check for existing account
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, provider')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Give a helpful message if they signed up via Google
      const msg =
        existingUser.provider === 'google'
          ? 'This email is linked to a Google account. Please sign in with Google.'
          : 'An account with this email already exists.';
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const isSuperAdmin = email === process.env.ADMIN_EMAIL_ADDRESS;
    const assignedRole = isSuperAdmin ? 'ADMIN' : 'USER';

    const hashedPassword = await hashPassword(password);

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name: full_name || 'New User',
        role: assignedRole,
        provider: 'local',
        scope: [],
      })
      .select('id, email, role')
      .single();

    if (error) throw error;

    // Send welcome email (non-blocking)
    resend.emails
      .send({
        from: 'CEiVoice Support <support@ceivoice.com>',
        to: email,
        subject: 'Welcome to CEiVoice!',
        react: WelcomeEmail({ fullName: full_name || 'User', role: assignedRole }),
      })
      .catch((err) => console.error('Failed to send welcome email:', err));

    return NextResponse.json({
      success: true,
      message: isSuperAdmin ? 'Welcome, Master Admin!' : 'Registration successful',
      user: newUser,
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
