// src/app/api/admin/merge/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // 1. Security: Check Cookies
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { parentTicketId, childTicketIds } = body;

    // 2. Validation
    if (!parentTicketId || !childTicketIds || !Array.isArray(childTicketIds)) {
      return NextResponse.json({ error: 'Invalid merge parameters' }, { status: 400 });
    }

    // 3. Logic: Update the child tickets
    // - Set their status to 'MERGED'
    // - Link them to the parent ticket
    const { error } = await supabaseAdmin
      .from('tickets')
      .update({ 
        parent_ticket_id: parentTicketId, 
        status: 'MERGED',
        updated_at: new Date().toISOString()
      })
      .in('id', childTicketIds);

    if (error) throw error;

    // 4. (Optional) Log history on the Parent Ticket
    await supabaseAdmin.from('ticket_history').insert({
      ticket_id: parentTicketId,
      changed_by: 'ADMIN',
      action: 'MERGE_PERFORMED',
      new_status: `Merged tickets: ${childTicketIds.join(', ')}`
    });

    return NextResponse.json({ success: true, message: 'Tickets merged successfully' });

  } catch (error: any) {
    console.error("Merge Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
