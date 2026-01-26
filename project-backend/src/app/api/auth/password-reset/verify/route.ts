// src/app/api/auth/password-reset/verify/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=Invalid+Token', request.url));
  }

  // 1. Verify token exists in DB before setting cookie
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('reset_token', token)
    .gt('reset_token_expiry', new Date().toISOString())
    .single();

  if (!user) {
    // If invalid, send them to login with an error
    return NextResponse.redirect(new URL('/login?error=Expired+or+Invalid+Link', request.url));
  }

  // 2. Token is valid. Create a redirect response to the Clean Page
  const response = NextResponse.redirect(new URL('/auth/reset-password', request.url));

  // 3. Set the token in a Secure, HttpOnly Cookie (User cannot see this)
  response.cookies.set('reset_flow_token', token, {
    httpOnly: true, // JavaScript cannot read this (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',
    maxAge: 1800, // 30 minutes expiration
    path: '/',
  });

  return response;
}
