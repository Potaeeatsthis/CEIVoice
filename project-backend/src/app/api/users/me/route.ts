// src/app/api/users/me/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT, AUTH_COOKIE } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, display_name, role, avatar_url')
      .eq('id', payload.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('GET /me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, display_name, email, avatar_url, old_password, new_password } = body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    // Name & display name
    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || full_name.trim().length === 0) {
        return NextResponse.json({ error: 'Full name cannot be empty' }, { status: 400 });
      }
      updates.full_name = full_name.trim();
    }

    if (display_name !== undefined) {
      updates.display_name = display_name?.trim() || null;
    }

    // Email
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }

      // Check if email is taken by another user
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .neq('id', payload.userId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }

      updates.email = email.toLowerCase();
    }

    // Avatar
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url || null;
    }

    // Password change
    if (new_password !== undefined) {
      if (!old_password) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }

      if (new_password.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }

      // Fetch current hash
      const { data: userRecord } = await supabaseAdmin
        .from('users')
        .select('password_hash')
        .eq('id', payload.userId)
        .single();

      if (!userRecord?.password_hash) {
        return NextResponse.json(
          { error: 'Password change is not available for OAuth accounts' },
          { status: 400 }
        );
      }

      const passwordMatch = await bcrypt.compare(old_password, userRecord.password_hash);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }

      updates.password_hash = await bcrypt.hash(new_password, 12);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', payload.userId)
      .select('id, email, full_name, display_name, role, avatar_url')
      .single();

    if (error) {
      console.error('PATCH /me error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('PATCH /me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
