// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { Resend } from 'resend'; // Ensure you have 'resend' installed
import RoleUpdatedEmail from '@/components/emails/RoleUpdatedEmail';

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, special_tags } = body;

    // ... validation logic (keep your existing validation here) ...

    const updateData: any = {};
    if (role) updateData.role = role;
    if (special_tags) updateData.special_tags = special_tags;

    // 1. Update Database
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Send Email Notification (Only if Role Changed)
    if (role && updatedUser.email) {
      try {
        await resend.emails.send({
          from: 'CEIVoice Admin <system@ceivoice.com>', // Replace with your verified sender
          to: updatedUser.email,
          subject: 'Your CEIVoice Role Has Been Updated',
          react: RoleUpdatedEmail({ 
            userName: updatedUser.full_name || 'User', 
            newRole: role 
          }),
        });
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("Failed to send role update email:", emailError);
      }
    }

    return NextResponse.json(updatedUser);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
