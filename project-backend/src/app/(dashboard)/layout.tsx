// src/app/(dashboard)/layout.tsx

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
// 👇 Import the components
import GlobalNotificationListener from '@/components/GlobalNotificationListener';
import Toast from '@/components/Toast'; 

async function getUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const guestUser = { id: null, name: 'Guest User', role: 'USER', initial: 'G' };
  if (!userId) return guestUser;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (error || !user) return guestUser;

  return { 
    id: user.id, 
    name: user.full_name || 'Unknown User', 
    role: user.role || 'USER',
    initial: user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <Sidebar 
        userRole={user.role} 
        userInitial={user.initial} 
        userName={user.name} 
      />
      <main className="flex-1 overflow-auto bg-black relative">
        <div className="max-w-7xl mx-auto p-8">
          {/* 👇 Inject Notification Logic */}
          {user.id && <GlobalNotificationListener userId={user.id} />}
          <Toast />
          
          {children}
        </div>
      </main>
    </div>
  );
}
