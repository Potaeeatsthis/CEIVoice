import Link from 'next/link';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase'; // ✅ Use Admin client to fetch user data safely

// Define the shape of our User object
type DashboardUser = {
  name: string;
  role: string;
  initial: string;
};

// ✅ NEW: Fetch real data from Supabase
async function getUser(): Promise<DashboardUser> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value; // ⚠️ Make sure your Login API sets this cookie!

  // Default fallback if no cookie is found
  const guestUser = { name: 'Guest User', role: 'USER', initial: 'G' };

  if (!userId) return guestUser;

  // Query the 'users' table matching your SQL schema
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('full_name, role')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error fetching user for layout:', error);
    return guestUser;
  }

  return { 
    name: user.full_name || 'Unknown User', 
    role: user.role || 'USER',
    initial: user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 flex flex-col border-r border-zinc-800 bg-zinc-950/50">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-6 w-6 bg-white rounded-full"></span>
            CEIVoice
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {/* COMMON LINKS */}
          <SidebarLink href="/tickets" icon="🎫" label="Tickets" />
          <SidebarLink href="/tickets/create" icon="✍️" label="New Ticket" />

          {/* ADMIN ONLY LINKS */}
          {(user.role === 'ADMIN' || user.role === 'ASSIGNEE') && (
            <>
              <div className="pt-6 pb-2 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Admin Console
              </div>
              <SidebarLink href="/admin/drafts" icon="📂" label="Drafts" />
              <SidebarLink href="/admin/users" icon="👥" label="Manage Users" />
            </>
          )}
        </nav>

        {/* User Profile - Now Dynamic! */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-zinc-700">
              {user.initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// Helper Component for Links
function SidebarLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200"
    >
      <span className="text-lg opacity-70">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
