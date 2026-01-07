// src/app/api/auth/register/route.ts
// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

import { WelcomeEmail } from '@/components/emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. We ONLY accept these fields. We IGNORE 'role' from the input.
    const { email, password, full_name } = await request.json();

    // 2. Validate Required Fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
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

    const isSuperAdmin = email === process.env.ADMIN_EMAIL_ADDRESS;
    const assignedRole = isSuperAdmin ? 'ADMIN' : 'USER';

    // 4. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Insert new user -> ALWAYS FORCE ROLE TO 'USER'
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name: full_name || 'New User',
        role:assignedRole,
        scope: [] // Empty scope for new users
      })
      .select('id, email, role')
      .single();

    if (error) throw error;

    try {
      await resend.emails.send({
        from: 'CEiVoice Support <support@ceivoice.com>',
        to: email,
        subject: 'Welcome to CEiVoice!',
        // 2. USE 'react' INSTEAD OF 'html'
        react: WelcomeEmail({ 
          fullName: full_name || 'User', 
          role: assignedRole 
        }),
      });
      console.log(`Confirmation email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }  
 
    return NextResponse.json({ 
      success: true, 
      message: isSuperAdmin ? 'Welcome, Master Admin!' : 'Registration successful',
      user: newUser 
    });

  } catch (error: any) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
