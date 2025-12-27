// src/app/api/auth/google/route.ts
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, full_name, google_id } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Check if user exists in YOUR manual table
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let finalUser = user;

    // 2. If user does NOT exist, create them (Auto-Registration)
    if (!finalUser) {
      // Generate a random secure password (since Google users won't use it)
      // This satisfies the "password_hash NOT NULL" constraint in your SQL
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: hashedPassword, // Dummy hash
          full_name: full_name || 'Google User',
          role: 'USER',
        })
        .select()
        .single();

      if (error) throw error;
      finalUser = newUser;
    }

    // 3. Generate YOUR Custom JWT
  // This ensures Google users get the exact same token format as password users
    const token = jwt.sign(
      { userId: finalUser.id, email: finalUser.email, role: finalUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    return NextResponse.json({
      success: true,
      message: user ? 'Login successful' : 'User registered via Google',
      token,
      user: {
        id: finalUser.id,
        email: finalUser.email,
        full_name: finalUser.full_name,
        role: finalUser.role
      }
    });

  } catch (error: any) {
    console.error('Google Auth Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
