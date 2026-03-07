// src/components/Sidebar.tsx

'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import ProfileModal from '@/components/ProfileModal';

export default function Sidebar({ userId, userRole, userInitial, userName }: { userId: string | null, userRole: string, userInitial: string, userName: string }) {
  const pathname = usePathname();

  const isAdmin = userRole === 'ADMIN';
  const isAssignee = userRole === 'ASSIGNEE';
  const isUser = userRole === 'USER';

  const [totalUnread, setTotalUnread] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  // Local state for real-time updates
  const [localName, setLocalName] = useState(userName);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabaseBrowser.rpc('get_unread_stats', { current_user_id: userId });
    if (data && !error) {
      const total = data.reduce((sum: number, item: any) => sum + (item.unread_count || 0), 0);
      setTotalUnread(total);
    }
  }, [userId]);

  const fetchDraftCount = useCallback(async () => {
    const { count } = await supabaseBrowser
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'DRAFT');
    setDraftCount(count || 0);
  }, []);

  // Fetch initial profile data on mount to get the avatar
  useEffect(() => {
    if (!userId) return;
    const fetchInitialProfile = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const data = await res.json();
          if (data.full_name || data.display_name) setLocalName(data.full_name || data.display_name);
          if (data.avatar_url) setLocalAvatar(data.avatar_url);
        }
      } catch (e) {
        console.error('Failed to fetch initial profile', e);
      }
    };
    fetchInitialProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchStats();
    fetchDraftCount();

    const statsInterval = setInterval(fetchStats, 15000);
    const draftInterval = setInterval(fetchDraftCount, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
        fetchDraftCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('refresh-unread-stats', fetchStats);

    const channel = supabaseBrowser
      .channel('sidebar-unread-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_reads' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchDraftCount())
      .subscribe();

    return () => {
      clearInterval(statsInterval);
      clearInterval(draftInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('refresh-unread-stats', fetchStats);
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, fetchStats, fetchDraftCount]);

  useEffect(() => {
    fetchStats();
    fetchDraftCount();
  }, [pathname, fetchStats, fetchDraftCount]);

  const displayInitial = localName ? localName.charAt(0).toUpperCase() : userInitial;

  return (
    <>
      <aside className="w-64 flex flex-col border-r border-zinc-800 bg-zinc-950/50 h-full">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex-shrink-0 rounded-xl overflow-hidden p-2 shadow-lg shadow-black/40">
              <Image src="/logo_cei.png" alt="CEI Logo" width={52} height={52} className="object-contain" priority />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-white tracking-tight leading-tight">CEIVoice</span>
              <span className="text-xs text-zinc-500 tracking-wide">Help Desk Portal</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isAdmin    && <AdminMenu    pathname={pathname} totalUnread={totalUnread} draftCount={draftCount} />}
          {isAssignee && <AssigneeMenu pathname={pathname} totalUnread={totalUnread} />}
          {isAssignee && <PersonalMenu pathname={pathname} />}
          {isUser && (
            <Suspense fallback={<UserMenu pathname={pathname} totalUnread={totalUnread} refParam={null} />}>
              <UserMenuWrapper pathname={pathname} totalUnread={totalUnread} />
            </Suspense>
          )}
        </nav>

        {/* ── Profile footer ── */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
          <button
            onClick={() => userId && setProfileOpen(true)}
            disabled={!userId}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg group hover:bg-zinc-800/60 transition-all duration-200 disabled:cursor-default text-left"
            title="Edit profile"
          >
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-zinc-700 flex-shrink-0 group-hover:border-zinc-600 transition-colors overflow-hidden">
              {localAvatar ? (
                <img src={localAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                displayInitial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{localName}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{userRole.toLowerCase()}</p>
            </div>
            {userId && (
              <svg className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </aside>

      {/* Modal outside <aside> to avoid stacking context issues */}
      {userId && (
        <ProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          userId={userId}
          userName={localName}
          userRole={userRole}
          userInitial={displayInitial}
          onProfileUpdate={(newName, newAvatar) => {
            setLocalName(newName);
            setLocalAvatar(newAvatar);
          }}
        />
      )}
    </>
  );
}

// Admin

function AdminMenu({ pathname, totalUnread, draftCount }: { pathname: string, totalUnread: number, draftCount: number }) {
  return (
    <div className="mb-6 space-y-1">
      <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Admin Console</div>
      <SidebarLink href="/admin/tickets" label="Admin Queue" currentPath={pathname} badgeCount={totalUnread}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
      />
      <SidebarLink href="/admin/drafts" label="Drafts (AI)" currentPath={pathname} badgeCount={draftCount}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
      />
      <SidebarLink href="/admin/reports" label="Reports & Metrics" currentPath={pathname}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      />
      <SidebarLink href="/admin/users" label="Manage Users" currentPath={pathname}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
      />
    </div>
  );
}

// Assignee

function AssigneeMenu({ pathname, totalUnread }: { pathname: string, totalUnread: number }) {
  return (
    <div className="mb-6 space-y-1">
      <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assignee Console</div>
      <SidebarLink href="/assignee/tickets" label="Assignee Dashboard" currentPath={pathname} badgeCount={totalUnread}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
      />
      <SidebarLink href="/assignee/reports" label="My Performance" currentPath={pathname}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      />
      <SidebarLink href="/assignee/history" label="History Log" currentPath={pathname}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
    </div>
  );
}

function PersonalMenu({ pathname }: { pathname: string }) {
  return (
    <div className="space-y-1">
      <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Personal</div>
      <SidebarLink href="/tickets" label="My Tickets" currentPath={pathname}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
      />
      <SidebarLink href="/tickets/create" label="New Request" currentPath={pathname}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
      />
    </div>
  );
}

// USER

function UserMenuWrapper({ pathname, totalUnread }: { pathname: string; totalUnread: number }) {
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  return <UserMenu pathname={pathname} totalUnread={totalUnread} refParam={refParam} />;
}

function UserMenu({ pathname, totalUnread, refParam }: { pathname: string; totalUnread: number; refParam: string | null }) {
  const isCommunity = pathname === '/user/community' || (pathname.startsWith('/tickets/') && refParam === 'community');
  const isFollowing = pathname === '/user/following' || (pathname.startsWith('/tickets/') && refParam === 'following');
  const isPersonal = pathname === '/tickets' || (pathname.startsWith('/tickets/') && pathname !== '/tickets/create' && !refParam);

  return (
    <>
      <div className="mb-6 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Community</div>
        <SidebarLink href="/user/community" label="Tickets" currentPath={pathname} forceActive={isCommunity}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <SidebarLink href="/user/following" label="Following" currentPath={pathname} forceActive={isFollowing}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
        />
      </div>
      <div className="space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Personal</div>
        <SidebarLink href="/tickets/create" label="Upload" currentPath={pathname}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
        />
        <SidebarLink href="/tickets" label="Tickets" currentPath={pathname} badgeCount={totalUnread} forceActive={isPersonal}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
        />
      </div>
    </>
  );
}

// Shared

function SidebarLink({ href, icon, label, currentPath, badgeCount, forceActive }: { href: string; icon: React.ReactNode; label: string; currentPath: string, badgeCount?: number, forceActive?: boolean }) {
  const isActive = forceActive !== undefined ? forceActive : (currentPath === href || (href !== '/' && currentPath.startsWith(href)));
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group
        ${isActive ? 'bg-zinc-800 text-white shadow-sm shadow-black/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
    >
      <div className="flex items-center gap-3">
        <span className={`${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-white'} transition-colors`}>{icon}</span>
        <span>{label}</span>
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  );
}
