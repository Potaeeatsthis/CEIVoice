// src/app/(dashboard)/user/history/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

const USER_RELEVANT_ACTIONS = [
  'Status changed to',
  'Ticket created',
  'Comment added',
  'Ticket resolved',
  'Ticket closed',
  'Ticket reopened',
  'Assigned to',
  'Assignee removed',
  'Priority set to',
];

function isRelevantAction(action: string) {
  return USER_RELEVANT_ACTIONS.some((a) => action.includes(a));
}

async function getUserHistoryLogs() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const role = cookieStore.get('user_role')?.value;

  if (!userId || role !== 'USER') {
    return { authorized: false, logs: [], ticketAssignees: {} };
  }

  const { data: userTickets, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select(`
      id,
      assignee:assigned_to (
        full_name
      )
    `)
    .eq('created_by', userId);

  if (ticketError || !userTickets?.length) {
    return { authorized: true, logs: [], ticketAssignees: {} };
  }

  const ticketIds = userTickets.map((t) => t.id);

  const ticketAssignees: Record<number, string> = {};
  for (const t of userTickets as any[]) {
    if (t.assignee?.full_name) {
      ticketAssignees[t.id] = t.assignee.full_name;
    }
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
    .in('ticket_id', ticketIds)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error(error);
    return { authorized: true, logs: [], ticketAssignees };
  }

  const filtered = (data || []).filter((log: any) => isRelevantAction(log.action));

  return { authorized: true, logs: filtered, ticketAssignees };
}

type StatusStyle = { dot: string; label: string };

function getStatusStyle(status: string): StatusStyle {
  switch (status) {
    case 'NEW':         return { dot: 'bg-blue-400',    label: 'text-blue-400' };
    case 'IN_PROGRESS': return { dot: 'bg-yellow-400',  label: 'text-yellow-400' };
    case 'RESOLVED':    return { dot: 'bg-emerald-400', label: 'text-emerald-400' };
    case 'CLOSED':      return { dot: 'bg-zinc-500',    label: 'text-zinc-400' };
    default:            return { dot: 'bg-zinc-400',    label: 'text-zinc-300' };
  }
}

function getPriorityStyle(priority: string): { color: string; dot: string } {
  switch (priority) {
    case 'LOW':      return { color: 'text-zinc-400',   dot: 'bg-zinc-400' };
    case 'MEDIUM':   return { color: 'text-yellow-400', dot: 'bg-yellow-400' };
    case 'HIGH':     return { color: 'text-orange-400', dot: 'bg-orange-400' };
    case 'CRITICAL': return { color: 'text-red-400',    dot: 'bg-red-400' };
    default:         return { color: 'text-zinc-300',   dot: 'bg-zinc-400' };
  }
}

function FormattedUserAction({ action }: { action: string }) {
  if (action.includes('Status changed to')) {
    const status = action.split('to ')[1];
    const style = getStatusStyle(status);
    return (
      <span className="flex items-center gap-2">
        <span className="text-zinc-400">Status changed to</span>
        <span className={`flex items-center gap-1.5 font-semibold ${style.label}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
          {status}
        </span>
      </span>
    );
  }
  if (action.includes('Priority set to')) {
    const priority = action.split('to ')[1];
    const style = getPriorityStyle(priority);
    return (
      <span className="flex items-center gap-2">
        <span className="text-zinc-400">Priority set to</span>
        <span className={`flex items-center gap-1.5 font-semibold ${style.color}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
          {priority}
        </span>
      </span>
    );
  }
  if (action.includes('Assigned to')) {
    const assignee = action.split('to ')[1];
    return (
      <span className="flex items-center gap-2">
        <span className="text-emerald-400 font-medium">Assigned to</span>
        <span className="text-white font-semibold">{assignee}</span>
      </span>
    );
  }
  if (action.includes('Assignee removed')) {
    return <span className="text-zinc-500 font-medium">Assignee removed</span>;
  }
  if (action.includes('Comment added')) {
    return (
      <span>
        <span className="text-violet-400 font-medium">New reply</span>
        <span className="text-zinc-400"> added to your ticket</span>
      </span>
    );
  }
  if (action.includes('Ticket created')) {
    return <span className="text-zinc-300 font-medium">Ticket submitted</span>;
  }
  if (action.includes('Ticket resolved')) {
    return <span className="text-emerald-400 font-medium">Ticket marked as resolved</span>;
  }
  if (action.includes('Ticket closed')) {
    return <span className="text-zinc-400 font-medium">Ticket closed</span>;
  }
  if (action.includes('Ticket reopened')) {
    return <span className="text-yellow-400 font-medium">Ticket reopened</span>;
  }
  return <span className="text-zinc-300">{action}</span>;
}

function AssigneeBadge({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
        {initial}
      </div>
      <span className="text-xs text-zinc-400">{name}</span>
    </div>
  );
}

export default async function UserHistoryPage() {
  const { authorized, logs, ticketAssignees } = await getUserHistoryLogs();

  if (!authorized) redirect('/');

  // Group by ticket_id + changed_by + 5-minute window
  // This ensures bulk changes (reassign + status + priority at same time) collapse into one group
  type GroupKey = string;
  type GroupedLog = {
    key: GroupKey;
    ticket_id: number;
    actor: string;
    summaryTime: string;
    actions: { id: number; action: string; timestamp: string }[];
  };

  const groupMap = new Map<GroupKey, GroupedLog>();

  for (const log of logs as any[]) {
    const actor = (log.users as any)?.full_name || 'System';

    // Round timestamp down to nearest 5-minute block
    const ts = log.timestamp ? new Date(log.timestamp) : new Date();
    const fiveMinBlock = Math.floor(ts.getTime() / (5 * 60 * 1000));
    const key = `${log.ticket_id}__${actor}__${fiveMinBlock}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        ticket_id: log.ticket_id,
        actor,
        summaryTime: log.timestamp,
        actions: [],
      });
    }
    groupMap.get(key)!.actions.push({
      id: log.id,
      action: log.action,
      timestamp: log.timestamp,
    });
  }

  const groupedLogs = Array.from(groupMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Ticket Activity</h1>
        <p className="text-zinc-400 mt-1">Status updates and activity on your submitted tickets.</p>
      </div>

      {groupedLogs.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-950/40">
          No activity yet. Submit a ticket to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedLogs.map((group) => {
            const assigneeName = ticketAssignees[group.ticket_id];
            return (
              <details
                key={group.key}
                suppressHydrationWarning
                className="group bg-zinc-950/40 border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  {/* Left: chevron + ticket id + current assignee */}
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-4 h-4 text-zinc-500 transition-transform duration-200 group-open:rotate-180 shrink-0"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <Link
                      href={`/user/tickets/${group.ticket_id}`}
                      className="font-mono text-blue-400 hover:text-blue-300 text-sm"
                    >
                      #{group.ticket_id}
                    </Link>
                    <span className="text-zinc-700 text-sm">·</span>
                    {assigneeName ? (
                      <AssigneeBadge name={assigneeName} />
                    ) : (
                      <span className="text-xs text-zinc-600 italic">Unassigned</span>
                    )}
                  </div>

                  {/* Middle: count pill */}
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 px-2 py-1 rounded-full">
                    {group.actions.length} update{group.actions.length !== 1 ? 's' : ''}
                  </span>

                  {/* Right: summary time */}
                  <span className="text-zinc-500 text-sm font-medium">
                    {new Date(group.summaryTime).toLocaleString([], {
                      year: 'numeric', month: 'numeric', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
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
                        <FormattedUserAction action={log.action} />
                      </div>
                      <span className="text-xs text-zinc-500 font-mono pr-4">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}