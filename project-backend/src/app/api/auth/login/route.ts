// src/app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { comparePassword, signJWT, AUTH_COOKIE, ROLE_COOKIE, cookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, full_name, role')
      .eq('email', email)
      .single();

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });

    response.cookies.set(AUTH_COOKIE, token, cookieOptions);

    response.cookies.set(ROLE_COOKIE, user.role, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
