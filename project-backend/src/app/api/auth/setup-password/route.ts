// src/app/api/auth/setup-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, verifyJWT, AUTH_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { password, displayName } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const updatePayload: Record<string, any> = { password_hash: hashedPassword };
    if (displayName?.trim()) {
      updatePayload.display_name = displayName.trim();
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', payload.userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Setup Password Error:', error);
    return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 });
  }
}
