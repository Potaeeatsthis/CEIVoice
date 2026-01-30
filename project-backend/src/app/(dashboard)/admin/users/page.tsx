// src/app/(dashboard)/admin/users/page.tsx
import { supabaseAdmin } from '@/lib/supabase';
import UserManagementTable from '@/components/UserManagementTable';

export const dynamic = 'force-dynamic'; // Ensures we always see fresh data

async function getUsers() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching users:", error.message);
    return [];
  }
  return data || [];
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  // Basic stats for the header
  const totalUsers = users.length;
  const staffCount = users.filter(u => u.role === 'ADMIN' || u.role === 'ASSIGNEE').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">User Management</h2>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            Control system access and define support scopes. Assign specialized tags (e.g., 'IT', 'Billing') to staff so the AI can route tickets effectively.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{staffCount} / {totalUsers}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Staff Ratio</div>
        </div>
      </div>

      <UserManagementTable initialUsers={users} />
    </div>
  );
}
