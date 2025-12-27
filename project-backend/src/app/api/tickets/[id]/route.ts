// src/app/api/tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Security: Check Role
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');

  // Users cannot update tickets directly
  if (userRole === 'USER') {
    return NextResponse.json({ error: 'Forbidden: Users cannot edit tickets directly.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Prevent updating 'id' or 'created_at'
  const { id: _, created_at, ...updates } = body; 

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // LOGGING: If status or assignee changed, log it
  if (updates.status) {
    await supabase.from('audit_logs').insert({
      ticket_id: parseInt(id),
      action: `Status updated to ${updates.status}`,
      changed_by: userId,
    });
  }
  if (updates.assigned_to) {
    await supabase.from('audit_logs').insert({
      ticket_id: parseInt(id),
      action: `Ticket assigned to user ID ${updates.assigned_to}`,
      changed_by: userId,
    });
  }

  return NextResponse.json({ data });
}
