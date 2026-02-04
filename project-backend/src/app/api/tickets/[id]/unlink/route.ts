// src/app/api/tickets/[id]/unlink/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const parentId = params.id;
    
    // 1. Auth Check
    const cookieStore = await cookies();
    const userId = request.headers.get('x-user-id') || cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Child ID from Body
    const body = await request.json();
    const { childTicketId } = body;

    if (!childTicketId) {
      return NextResponse.json({ error: 'Missing childTicketId' }, { status: 400 });
    }

    // 3. Unlink Logic: Reset Child Ticket
    // - Remove parent_ticket_id
    // - Set status back to 'NEW' so it appears in the inbox again
    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        parent_ticket_id: null,
        status: 'NEW',
        updated_at: new Date().toISOString()
      })
      .eq('id', childTicketId)
      .eq('parent_ticket_id', parentId); // Safety check: ensure it actually belongs to this parent

    if (updateError) throw updateError;

    // 4. Log Internal Comment on Parent
    await supabaseAdmin.from('comments').insert({
      ticket_id: parentId,
      user_id: userId,
      message: `System: Unlinked ticket #${childTicketId} from this group.`,
      is_internal: true
    });

    return NextResponse.json({ success: true, message: 'Ticket unlinked successfully' });

  } catch (error: any) {
    console.error('Unlink Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
