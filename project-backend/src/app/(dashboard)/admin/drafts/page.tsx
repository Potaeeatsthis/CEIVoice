import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getDrafts() {
  const { data } = await supabaseAdmin
    .from('tickets')
    .select('*, created_by_user:users!tickets_created_by_fkey(email)')
    .eq('status', 'DRAFT')
    .order('created_at', { ascending: false });
  return data || [];
}

export default async function AdminDraftsPage() {
  const drafts = await getDrafts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Draft Review Queue</h2>
        <p className="text-zinc-400 mt-1">
          Review and activate AI-generated drafts. These are invisible to assignees until approved.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {drafts.length === 0 ? (
          <div className="p-12 text-center border border-zinc-800 rounded-lg bg-zinc-950/40 text-zinc-500">
            No pending drafts found.
          </div>
        ) : (
          drafts.map((draft: any) => (
            <div key={draft.id} className="group relative flex flex-col sm:flex-row gap-6 p-6 rounded-lg border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                    AI DRAFT
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {new Date(draft.created_at).toLocaleString()}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {draft.title || "Untitled Draft"}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                    {draft.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>From: <span className="text-zinc-300">{draft.created_by_user?.email}</span></span>
                  <span>AI Suggested Category: <span className="text-zinc-300">{draft.category || 'Uncategorized'}</span></span>
                </div>
              </div>

              <div className="flex items-center">
                <Link
                  href={`/admin/drafts/${draft.id}`}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors"
                >
                  Review & Activate
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
