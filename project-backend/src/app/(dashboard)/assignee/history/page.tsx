import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

async function getHistoryLogs() {
  const cookieStore = await cookies();

  const userId = cookieStore.get('user_id')?.value;
  const role = cookieStore.get('user_role')?.value;

  // 🔒 Only staff allowed
  if (!userId || (role !== 'ADMIN' && role !== 'ASSIGNEE')) {
    return { authorized: false, logs: [] };
  }

  // ✅ Join users table to show WHO did the action
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select(`
      id,
      action,
      timestamp,
      ticket_id,
      user:users!audit_logs_changed_by_fkey (
        full_name,
        email
      )
    `)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error(error);
    return { authorized: true, logs: [] };
  }

  return { authorized: true, logs: data || [] };
}

export default async function HistoryPage() {
  const { authorized, logs } = await getHistoryLogs();

  if (!authorized) redirect('/');

  return (
    <div className="space-y-6">

      {/* ---------- Header ---------- */}
      <div>
        <h1 className="text-3xl font-bold text-white">History Log</h1>
        <p className="text-zinc-400 mt-1">
          All ticket updates and actions.
        </p>
      </div>

      {/* ---------- Table ---------- */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        <table className="w-full text-sm text-left">

          {/* Header */}
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              <th className="px-6 py-3">Ticket</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">By</th>
              <th className="px-6 py-3">Date</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-zinc-800">
            {logs.map((log: any) => (
              <tr
                key={log.id}
                className="hover:bg-zinc-900/40 transition-colors"
              >
                {/* Ticket ID (clickable) */}
                <td className="px-6 py-3 font-mono text-blue-400 hover:underline">
                  <Link href={`/assignee/tickets/${log.ticket_id}`}>
                    #{log.ticket_id}
                  </Link>
                </td>

                {/* Action */}
                <td className="px-6 py-3 text-zinc-200">
                  {log.action}
                </td>

                {/* Who */}
                <td className="px-6 py-3">
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
                    {log.user?.full_name || 'System'}
                  </span>
                </td>

                {/* Time */}
                <td className="px-6 py-3 text-zinc-500 text-xs">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {logs.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No history yet.
          </div>
        )}
      </div>
    </div>
  );
}
