// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// Define valid roles to prevent typos or invalid inputs
const VALID_ROLES = ['USER', 'ASSIGNEE', 'ADMIN'];

export async function POST(request: Request) {
  try {
    const { email, password, full_name, role } = await request.json();

    // 1. Validate Required Fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 2. Validate Role (Optional, defaults to USER)
    // If a role IS provided, make sure it is one of the allowed types
    let assignedRole = 'USER';
    if (role) {
      const upperRole = role.toUpperCase();
      if (!VALID_ROLES.includes(upperRole)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
          { status: 400 }
        );
      }
      assignedRole = upperRole;
    }

    // 3. Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // 4. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Insert new user into DB with the specific ROLE
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name: full_name || 'New User',
        role: assignedRole // <--- Uses the input role
      })
      .select('id, email, role')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: newUser });

  } catch (error: any) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
