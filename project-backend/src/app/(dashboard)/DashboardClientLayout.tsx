"use client";
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function DashboardClientLayout({ user, children }: { user: any, children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar for desktop only (md and up) */}
      <div className="hidden md:flex h-full">
        <Sidebar userId={user?.id} userRole={user?.role} userInitial={user?.initial} userName={user?.name} />
      </div>
      {/* Sidebar drawer for mobile only (below md) */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-64 z-50 bg-zinc-950 border-r border-zinc-800 transition-transform duration-300 md:hidden">
            <Sidebar userId={user?.id} userRole={user?.role} userInitial={user?.initial} userName={user?.name} />
          </div>
        </>
      )}
      {/* Sidebar toggle button for mobile (restore previous position: left top) */}
      <button
        className="md:hidden fixed left-4 top-4 z-50 bg-zinc-900 border border-zinc-700 rounded-full p-3 shadow-lg hover:bg-zinc-800 transition-colors"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {/* Main content */}
      <main className="flex-1 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
