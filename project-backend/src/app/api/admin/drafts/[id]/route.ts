// src/app/api/admin/drafts/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH: Updates a specific draft (Edit fields or Publish)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRole = request.headers.get('x-user-role');
  if (userRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await  params;
  const body = await request.json();
  const { action, ...updates } = body; 

  // SCENARIO: PUBLISH (Draft -> New)
  if (action === 'PUBLISH') {
    const { data, error } = await supabase
      .from('tickets')
      .update({ 
        status: 'NEW', 
        created_at: new Date().toISOString() // Reset time to now
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // TODO: Send email notification to User (EP01-ST005)
    
    return NextResponse.json({ message: 'Ticket Published', ticket: data });
  }

  // SCENARIO: EDIT DRAFT (Just updating fields)
  // Covers EP03-ST002 (Modify AI fields)
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Draft Updated', data });
}
