// src/components/SidebarToggleMobile.tsx
'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';

export default function SidebarToggleMobile({ userId, userRole, userInitial, userName }: { userId: string, userRole: string, userInitial: string, userName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button: only visible on small screens, top right */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-full p-3 shadow-lg hover:bg-zinc-800 transition-colors"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
        onClick={() => setOpen(true)}
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {/* Sidebar drawer: only visible on small screens when open */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-64 z-50 bg-zinc-950 border-l border-zinc-800 transition-transform duration-300 md:hidden">
            <Sidebar
              userId={userId}
              userRole={userRole}
              userInitial={userInitial}
              userName={userName}
            />
          </div>
        </>
      )}
    </>
  );
}
