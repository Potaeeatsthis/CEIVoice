// src/app/api/tickets/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET remains the same...
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        assigned_to_user:users!tickets_assigned_to_fkey (id, full_name),
        created_by_user:users!tickets_created_by_fkey (id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 👇 THIS IS THE FIXED FUNCTION
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth Check
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // ✅ FIX: We now extract ALL fields, including deadline
    const { 
      title, 
      description, 
      status, 
      priority, 
      category, 
      deadline, 
      assigned_to 
    } = body;

    // Construct update object dynamically
    const updates: any = { updated_at: new Date().toISOString() };
    
    // Update fields if they exist in the request
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    
    // ✅ Fix for Deadline
    if (deadline !== undefined) updates.deadline = deadline;
    
    // Handle "Unassigned"
    if (assigned_to === '') {
        updates.assigned_to = null;
    } else if (assigned_to) {
        updates.assigned_to = assigned_to;
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ticket: data });

  } catch (error: any) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
