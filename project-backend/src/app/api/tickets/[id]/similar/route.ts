// src/app/api/tickets/[id]/similar/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the current ticket's embedding (the math numbers)
    const { data: currentTicket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('embedding')
      .eq('id', id)
      .single();

    if (fetchError || !currentTicket?.embedding) {
      return NextResponse.json({ tickets: [] });
    }

    // Ask the database to find other tickets with similar numbers
    const { data: similarTickets, error: matchError } = await supabaseAdmin.rpc('find_duplicate_tickets', {
      query_embedding: currentTicket.embedding,
      match_threshold: 0.85, // Only show highly similar tickets (85% match or higher)
      match_count: 5         // Max 5 suggestions
    });

    if (matchError) throw matchError;

    // Filter out the current ticket itself and return the rest
    const duplicates = similarTickets.filter((t: any) => t.id !== Number(id));

    return NextResponse.json({ tickets: duplicates });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
