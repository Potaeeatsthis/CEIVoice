// src/app/api/auth/password-reset/verify/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RESET_COOKIE } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(new URL('/?error=Invalid+link', appUrl));
  }

  // Verify token exists and has not expired
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('reset_token', token)
    .gt('reset_token_expiry', new Date().toISOString())
    .single();

  if (!user) {
    return NextResponse.redirect(new URL('/?error=Expired+or+invalid+link', appUrl));
  }

  const response = NextResponse.redirect(
    new URL('/reset-password', appUrl)
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