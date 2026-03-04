// src/app/api/auth/password-reset/verify/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RESET_COOKIE } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=Invalid+link', request.url));
  }

  // Verify token exists and has not expired
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('reset_token', token)
    .gt('reset_token_expiry', new Date().toISOString())
    .single();

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=Expired+or+invalid+link', request.url));
  }

  const response = NextResponse.redirect(
    new URL('/reset-password', request.url)
  );

  response.cookies.set(RESET_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 60, // 30 minutes
    path: '/',
  });

  return response;
}
