import { supabaseAdmin } from '@/lib/supabase';
import DraftEditorForm from '@/components/DraftEditorForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Fetch Draft Data directly from DB (Replaces the fetch call)
async function getDraftData(id: string) {
  // 1. Fetch the Draft Ticket
  const { data: draft } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (!draft) return null;

  // 2. Fetch Potential Assignees (Staff)
  const { data: staff } = await supabaseAdmin
    .from('users')
    .select('id, full_name')
    .in('role', ['ADMIN', 'ASSIGNEE']);

  return { draft, staff: staff || [] };
}

export default async function DraftReviewPage({ params }: { params: { id: string } }) {
  // Await params for Next.js 15
  const { id } = await params;
  const data = await getDraftData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/drafts" className="text-zinc-400 hover:text-white transition-colors">
          &larr; Back to Draft Queue
        </Link>
        <h1 className="text-2xl font-bold text-white">Review AI Draft #{data.draft.id}</h1>
      </div>
      
      {/* Pass the server-fetched data to the client form */}
      <DraftEditorForm draft={data.draft} staff={data.staff} />
    </div>
  );
}
