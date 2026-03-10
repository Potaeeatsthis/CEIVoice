// src/app/api/admin/drafts/[id]/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTicketCreatedEmail } from '@/lib/email';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('user_role')?.value;
  const userId = cookieStore.get('user_id')?.value;

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, ...updates } = body;

  // SCENARIO: PUBLISH (Draft -> New)
  if (action === 'PUBLISH') {
    const { data: existing } = await supabaseAdmin
      .from('tickets')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing || existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Ticket is not in DRAFT status — cannot publish.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'NEW', created_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, created_by_user:users!tickets_created_by_fkey(id, email, full_name, role)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Write audit log entry
    await supabaseAdmin.from('audit_logs').insert({
      ticket_id: Number(id),
      action: 'Status changed to NEW',
      changed_by: userId,
      timestamp: new Date().toISOString(),
    });

    // Send email to ticket creator
    const creator = data.created_by_user;
    if (creator?.email) {
      try {
        await sendTicketCreatedEmail(
          creator.email,
          creator.full_name || 'User',
          data.id,
          data.title || 'Untitled Ticket',
          data.description || '',
          creator.role || 'USER',
          data.priority || 'MEDIUM',
        );
        console.log(`✅ Ticket created email sent to ${creator.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send ticket created email:', emailError);
      }
    }

    return NextResponse.json({ message: 'Ticket Published', ticket: data });
  }

  // SCENARIO: EDIT DRAFT
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Draft Updated', data });
}