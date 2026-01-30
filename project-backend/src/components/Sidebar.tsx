'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ userRole, userInitial, userName }: { userRole: string, userInitial: string, userName: string }) {
  const pathname = usePathname();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ASSIGNEE';

  return (
    <aside className="w-64 flex flex-col border-r border-zinc-800 bg-zinc-950/50 h-full">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="h-6 w-6 bg-white rounded-full"></div>
          CEIVoice
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* --- ADMIN CONSOLE --- */}
        {isAdmin && (
          <div className="mb-6 space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Admin Console
            </div>
            <SidebarLink 
              href="/admin/tickets" 
              label="Admin Queue" 
              currentPath={pathname}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            />
            <SidebarLink 
              href="/admin/drafts" 
              label="Drafts (AI)" 
              currentPath={pathname}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <SidebarLink 
              href="/admin/users" 
              label="Manage Users" 
              currentPath={pathname}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            />
          </div>
        )}

        {/* --- PERSONAL WORKSPACE --- */}
        <div className="space-y-1">
          <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Personal
          </div>
          <SidebarLink 
            href="/user/tickets" 
            label="My Tickets" 
            currentPath={pathname}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
          />
          <SidebarLink 
            href="/tickets/create" 
            label="New Request" 
            currentPath={pathname}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          />
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-zinc-700">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-zinc-500 truncate capitalize">{userRole.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// --- LINK COMPONENT WITH IMPROVED HOVER ---
function SidebarLink({ href, icon, label, currentPath }: { href: string; icon: React.ReactNode; label: string; currentPath: string }) {
  // Check if link is active
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));

  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group
        ${isActive 
          ? 'bg-zinc-800 text-white shadow-sm shadow-black/40' // ACTIVE STATE: Lighter BG, White Text
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' // HOVER STATE: Subtle BG fade, White Text
        }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-white'} transition-colors`}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
