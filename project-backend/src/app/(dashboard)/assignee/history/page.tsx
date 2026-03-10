import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import PriorityIcon from '@/components/PriorityIcon';

async function getHistoryLogs() {
  const cookieStore = await cookies();

  const userId = cookieStore.get('user_id')?.value;
  const role = cookieStore.get('user_role')?.value;

  if (!userId || (role !== 'ADMIN' && role !== 'ASSIGNEE')) {
    return { authorized: false, logs: [] };
  }

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select(`
      id,
      action,
      timestamp,
      ticket_id,
      users:changed_by (
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

function FormattedAction({ action }: { action: string }) {
  if (action.includes('Category set to')) {
    return <span><span className="text-purple-400 font-medium">Category</span> set to <span className="text-white font-medium">{action.split('to ')[1]}</span></span>;
  }
  if (action.includes('Status changed to')) {
    return <span><span className="text-blue-400 font-medium">Status</span> changed to <span className="text-white font-medium">{action.split('to ')[1]}</span></span>;
  }
  if (action.includes('Assigned to')) {
    return <span><span className="text-emerald-400 font-medium">Assigned</span> to <span className="text-white font-medium">{action.split('to ')[1]}</span></span>;
  }
  if (action.includes('Deadline')) {
    const detail = action.replace('Deadline ', '');
    return <span><span className="text-red-400 font-medium">Deadline</span> <span className="text-white font-medium">{detail}</span></span>;
  }
  if (action.includes('Priority set to')) {
    const priority = action.split('to ')[1];
    return <span className="flex items-center gap-2 inline-flex"><span className="text-zinc-400 font-medium">Priority set to</span> <PriorityIcon priority={priority} /> <span className="text-white font-medium">{priority}</span></span>;
  }
  return <span className="text-zinc-300">{action}</span>;
}

export default async function HistoryPage() {
  const { authorized, logs } = await getHistoryLogs();

  if (!authorized) redirect('/');

  // Group logs by ticket_id + user + minute
  type GroupKey = string;
  type GroupedLog = {
    key: GroupKey;
    ticket_id: number;
    user: string;
    summaryTime: string;
    actions: { id: number; action: string; timestamp: string }[];
  };

  const groupMap = new Map<GroupKey, GroupedLog>();
  for (const log of logs as any[]) {
    const minute = log.timestamp ? log.timestamp.slice(0, 16) : 'unknown';
    const user = log.users?.full_name || 'System';
    const key = `${log.ticket_id}__${user}__${minute}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, ticket_id: log.ticket_id, user, summaryTime: log.timestamp, actions: [] });
    }
    groupMap.get(key)!.actions.push({ id: log.id, action: log.action, timestamp: log.timestamp });
  }
  const groupedLogs = Array.from(groupMap.values());

  return (
    <div className="space-y-6">

      {/* ---------- Header ---------- */}
      <div>
        <h1 className="text-3xl font-bold text-white">History Log</h1>
        <p className="text-zinc-400 mt-1">
          All ticket updates and actions.
        </p>
      </div>

      {/* ---------- List ---------- */}
      {groupedLogs.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-950/40">
          No history yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedLogs.map((group) => (
            <details
              key={group.key}
              className="group bg-zinc-950/40 border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                {/* Left: chevron + ticket + user */}
                <div className="flex items-center gap-3">
                  <svg
                    className="w-4 h-4 text-zinc-500 transition-transform duration-200 group-open:rotate-180 shrink-0"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <Link
                    href={`/assignee/tickets/${group.ticket_id}`}
                    className="font-mono text-blue-400 hover:text-blue-300 text-sm"
                  >
                    #{group.ticket_id}
                  </Link>
                  <span className="text-zinc-500 text-sm">·</span>
                  <span className={`text-sm ${group.user === 'System' ? 'text-zinc-600' : 'text-zinc-200 font-medium'}`}>
                    {group.user}
                  </span>
                </div>

                {/* Middle: count pill */}
                <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 px-2 py-1 rounded-full">
                  {group.actions.length} update{group.actions.length !== 1 ? 's' : ''}
                </span>

                {/* Right: summary time */}
                <span className="text-zinc-500 text-sm font-medium">
                  {new Date(group.summaryTime).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </summary>

              {/* Expanded actions */}
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/50 bg-black/20 space-y-1">
                {group.actions.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between ml-6 pl-4 border-l-2 border-zinc-800 py-1.5 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="text-zinc-600">↳</span>
                      <FormattedAction action={log.action} />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono pr-4">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
