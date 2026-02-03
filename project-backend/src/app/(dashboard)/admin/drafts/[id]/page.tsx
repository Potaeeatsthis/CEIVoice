import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import DraftEditor from '@/components/DraftEditor'; // 👈 Import the new component

export default async function DraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch Draft Data
  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*, created_by_user:users!tickets_created_by_fkey(email)')
    .eq('id', id)
    .single();

  if (!ticket) return notFound();

  // 2. Fetch Potential Assignees (Staff Only)
  const { data: staff } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .in('role', ['ADMIN', 'ASSIGNEE']);

  // 3. Render Editor
  return <DraftEditor ticket={ticket} allUsers={staff || []} />;
}
