import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketIds, title, description, priority } = body;
    
    // 1. Debugging Log (Check your server console to see this)
    console.log("Merge Request Received:", { ticketIds, title });

    // 2. Authentication
    const cookieStore = await cookies();
    const userId = request.headers.get('x-user-id') || cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length < 2) {
      console.error("Merge Validation Failed. Received:", body);
      return NextResponse.json({ error: 'Invalid merge parameters: You must select at least 2 tickets.' }, { status: 400 });
    }

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 });
    }

    // 4. Create the new Parent Ticket (The "Consolidated Draft")
    const { data: parentTicket, error: createError } = await supabaseAdmin
      .from('tickets')
      .insert({
        title,
        description,
        priority: priority || 'MEDIUM',
        status: 'NEW', // It starts as a new active ticket
        created_by: userId,
        category: 'General',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Create Parent Error:", createError);
      throw createError;
    }

    // 5. Update the Old Tickets (Mark as MERGED)
    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        status: 'MERGED',
        // If you have this column, uncomment it to link them in DB:
        // parent_ticket_id: parentTicket.id  
      })
      .in('id', ticketIds);

    if (updateError) {
      console.error("Update Children Error:", updateError);
      throw updateError;
    }

    // 6. Log Internal Note
    await supabaseAdmin.from('comments').insert({
      ticket_id: parentTicket.id,
      user_id: userId,
      message: `System: Merged from tickets #${ticketIds.join(', #')}`,
      is_internal: true
    });

    return NextResponse.json({ success: true, parentId: parentTicket.id });

  } catch (error: any) {
    console.error('Merge API Critical Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
