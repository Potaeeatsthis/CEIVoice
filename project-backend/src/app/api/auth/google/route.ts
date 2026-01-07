// src/app/api/auth/google/route.ts
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    // 1. Get the ID Token sent from the Frontend
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID Token' }, { status: 400 });
    }

    // 2. VERIFY the token with Google
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID, 
    });
    
    const payload = ticket.getPayload();
    const googleEmail = payload?.email;
    const googleName = payload?.name;

    if (!googleEmail) {
      return NextResponse.json({ error: 'Invalid Token: Email missing' }, { status: 400 });
    }

    // 3. Check if user exists in your database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', googleEmail)
      .single();

    let finalUser = user;

    [cite_start]// 4. If user does NOT exist, create them (Auto-Registration) [cite: 30]
    if (!finalUser) {
      console.log(`Creating new user for Google login: ${googleEmail}`);

      // Generate a secure random dummy password
      // This satisfies your database "password_hash NOT NULL" constraint
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: googleEmail,
          password_hash: hashedPassword, // Dummy hash (user cannot use this to login manually)
          full_name: googleName || 'Google User',
          role: 'USER', // Default role
          avatar_url: payload?.picture, // Bonus: Save their Google profile pic
        })
        .select()
        .single();

      if (error) {
        console.error("Database Insert Error:", error);
        throw new Error('Failed to create user');
      }
      finalUser = newUser;
    }

    // 5. Generate YOUR System's JWT
    // This unifies the session format for both Password and Google users
    const token = jwt.sign(
      { 
        userId: finalUser.id, 
        email: finalUser.email, 
        role: finalUser.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    // 6. Return Success
    return NextResponse.json({
      success: true,
      message: user ? 'Login successful' : 'User registered via Google',
      token,
      user: {
        id: finalUser.id,
        email: finalUser.email,
        full_name: finalUser.full_name,
        role: finalUser.role,
        avatar_url: finalUser.avatar_url
      }
    });

  } catch (error: any) {
    console.error('Google Auth Route Error:', error.message);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
