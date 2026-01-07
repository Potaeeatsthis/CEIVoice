// src/app/api/admin/promote/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    // FIX: You must await headers() in Next.js 15+
    const headerStore = await headers();
    const requesterRole = headerStore.get('x-user-role'); 
    
    // 1. SECURITY: Ensure the requester is an ADMIN
    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // 2. Get the Target User ID and the New Role
    const { userId, newRole } = await request.json();

    // 3. Validate the Role
    const VALID_ROLES = ['USER', 'ASSIGNEE', 'ADMIN'];
    if (!VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid Role' }, { status: 400 });
    }

    // 4. Update the User in the Database
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select('id, email, role')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `User promoted to ${newRole}`, 
      user: data 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
