import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const userRole = request.headers.get('x-user-role');

//  if (userRole !== 'ADMIN') {
//    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//  }

  const { data, error } = await supabase
    .from('tickets')
    .select('id, title, user_email, created_at, category, summary') 
    .eq('status', 'DRAFT') // Ensure this is uppercase 'DRAFT'
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
