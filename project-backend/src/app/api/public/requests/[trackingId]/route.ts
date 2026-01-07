// src/app/api/public/requests/[trackingId]/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  // Change Type: Context is now a Promise
  { params }: { params: Promise<{ trackingId: string }> } 
) {
  // FIX: Await the params object
  const { trackingId } = await params; 

  const { data, error } = await supabase
    .from('tickets')
    .select('id, status, created_at, title, category')
    .eq('id', trackingId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
