// src/app/api/admin/drafts/merge/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { parentDraftId, childDraftIds } = body; // IDs of tickets to merge

  if (!parentDraftId || !childDraftIds || !Array.isArray(childDraftIds)) {
    return NextResponse.json({ error: 'Invalid merge parameters' }, { status: 400 });
  }

  // Logic: Link child tickets to the parent and close them
  const { error } = await supabase
    .from('tickets')
    .update({ 
        parent_ticket_id: parentDraftId, 
        status: 'MERGED' 
    })
    .in('id', childDraftIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Drafts merged successfully' });
}
