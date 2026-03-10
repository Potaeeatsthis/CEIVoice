// src/app/api/auth/logout/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies by setting maxAge to 0
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  response.cookies.set('user_role', '', { maxAge: 0, path: '/' });
  response.cookies.set('user_id', '', { maxAge: 0, path: '/' });

  return response;
}