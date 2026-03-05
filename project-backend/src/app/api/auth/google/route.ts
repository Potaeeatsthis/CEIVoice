// src/app/api/auth/google/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, signJWT, AUTH_COOKIE, ROLE_COOKIE, cookieOptions } from '@/lib/auth';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();
    const googleEmail = googlePayload?.email;
    const googleName = googlePayload?.name;
    const googleId = googlePayload?.sub;

    if (!googleEmail || !googleId) {
      return NextResponse.json({ error: 'Invalid token: missing email or sub' }, { status: 400 });
    }

    // Check if user exists
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, provider')
      .eq('email', googleEmail)
      .single();

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      // Generate a random dummy password_hash to satisfy DB NOT NULL constraint.
      // The user will be redirected to /setup-password to set a real one.
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const hashedDummy = await hashPassword(dummyPassword);

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: googleEmail,
          password_hash: hashedDummy,
          full_name: googleName || 'Google User',
          role: 'USER',
          provider: 'google',
          google_id: googleId,
          scope: [],
        })
        .select('id, email, full_name, role')
        .single();

      if (error) {
        console.error('Google user creation error:', error);
        throw new Error('Failed to create user');
      }

      user = newUser;
    } else if (user.provider === 'local') {
      // Existing manual account — link Google ID without overwriting anything
      await supabaseAdmin
        .from('users')
        .update({ google_id: googleId })
        .eq('id', user.id);
    }

    // Issue JWT (same shape as manual login)
    const token = await signJWT({
      userId: user!.id,
      email: user!.email,
      role: user!.role,
    });

    const response = NextResponse.json({
      success: true,
      isNewUser, // <-- frontend uses this to redirect new users to /setup-password
      user: {
        id: user!.id,
        email: user!.email,
        full_name: user!.full_name,
        role: user!.role,
      },
    });

    response.cookies.set(AUTH_COOKIE, token, cookieOptions);
    response.cookies.set(ROLE_COOKIE, user!.role, {
      ...cookieOptions,
      httpOnly: false,
    });
    response.cookies.set('user_id', user!.id, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
