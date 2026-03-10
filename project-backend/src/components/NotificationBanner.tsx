// src/components/NotificationBanner.tsx // 
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type NotificationEvent = {
  message: string;
  ticketId: number;
  type: 'success' | 'error';
};

export default function NotificationBanner() {
  const [notification, setNotification] = useState<NotificationEvent | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationEvent>;
      setNotification(customEvent.detail);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  if (!notification) return null;

  const handleClick = () => {
    // Smart Redirect: Check if user is currently in Admin or User mode
    const isAdmin = pathname?.startsWith('/admin');
    const targetPath = isAdmin 
      ? `/admin/tickets/${notification.ticketId}` 
      : `/user/tickets/${notification.ticketId}`; // or /tickets/${id} depending on your routes
    
    router.push(targetPath);
    setNotification(null);
  };

  return (
    <div 
      onClick={handleClick}
      className="fixed top-0 left-0 w-full z-[100] cursor-pointer animate-in slide-in-from-top duration-300 shadow-xl"
    >
      <div className="bg-emerald-600 border-b border-emerald-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
          
          {/* THE BADGE */}
          <div className="flex-shrink-0 bg-white text-emerald-700 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            Ticket #{notification.ticketId}
          </div>

          {/* THE MESSAGE */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              <span className="opacity-80 mr-2">New message:</span>
              {notification.message}
            </p>
          </div>

          {/* CTA */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
            View Chat 
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </div>

          {/* CLOSE BUTTON */}
          <button 
            onClick={(e) => { e.stopPropagation(); setNotification(null); }}
            className="ml-4 text-emerald-200 hover:text-white p-1 rounded-md hover:bg-emerald-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
