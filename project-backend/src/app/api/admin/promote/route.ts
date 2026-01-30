// src/app/api/admin/promote/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // 1. SECURITY: Check the Cookie directly (More reliable than headers here)
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // 2. Parse the Ticket Data (Not User data)
    const body = await request.json();
    const { 
      id, 
      title, 
      description, 
      priority, 
      category, 
      assigned_to, 
      deadline 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // 3. Update the Ticket: Set Status to 'NEW'
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update({
        title,
        description,
        priority,
        category,
        assigned_to: assigned_to || null, // Handle unassigned
        deadline: deadline || null,       // Handle empty deadline
        status: 'NEW',                    // ACTIVATION STEP
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Ticket activated successfully', 
      ticket: data 
    });

  } catch (error: any) {
    console.error("Promote Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
