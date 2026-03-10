// src/app/(dashboard)/layout.tsx

export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import SidebarToggleMobile from '@/components/SidebarToggleMobile';
import GlobalNotificationListener from '@/components/GlobalNotificationListener';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .eq('id', payload.userId)
    .single();

  if (error || !user) return null;

  return {
    id: user.id,
    name: user.full_name || 'Unknown User',
    role: user.role || 'USER',
    initial: user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U',
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // State for sidebar toggle (client-only)
    // Note: This file is async/server, so use a client component for the toggle
    // Insert a client-only SidebarToggle component for mobile
    // ...existing code...
  const user = await getUser();

  // Guest layout — no sidebar, fixed height, no scroll
  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
        {/* Minimal guest header */}
        <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-950/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">CEIVOICE</span>
            <span className="text-xs text-zinc-600">HELP DESK</span>
          </div>
          <a
            href="/login"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
          >
            Sign In
          </a>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="h-full max-w-7xl mx-auto px-8 py-6 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Authenticated layout — sidebar hidden on small screens
  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Sidebar: hidden on small screens, visible on md+ */}
      <div className="hidden md:block h-full">
        <Sidebar
          userId={user.id}
          userRole={user.role}
          userInitial={user.initial}
          userName={user.name}
        />
      </div>
      {/* Mobile sidebar toggle button (top right) */}
      <SidebarToggleMobile
        userId={user.id}
        userRole={user.role}
        userInitial={user.initial}
        userName={user.name}
      />
      <main className="flex-1 overflow-y-auto bg-black relative flex flex-col">
        <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-8 flex flex-col">
          <GlobalNotificationListener userId={user.id} />
          {children}
        </div>
      </main>
    </div>
  );
}