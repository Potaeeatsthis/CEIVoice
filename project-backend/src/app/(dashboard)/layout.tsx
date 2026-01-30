import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar'; // Import the new component

async function getUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  const guestUser = { name: 'Guest User', role: 'USER', initial: 'G' };

  if (!userId) return guestUser;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('full_name, role')
    .eq('id', userId)
    .single();

  if (error || !user) return guestUser;

  return { 
    name: user.full_name || 'Unknown User', 
    role: user.role || 'USER',
    initial: user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Replaced old sidebar with the Client Component */}
      <Sidebar 
        userRole={user.role} 
        userInitial={user.initial} 
        userName={user.name} 
      />

      <main className="flex-1 overflow-auto bg-black">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
