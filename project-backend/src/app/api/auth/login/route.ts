// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Find user by email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' } // Token valid for 1 day
    );

    // Return user info and token
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
