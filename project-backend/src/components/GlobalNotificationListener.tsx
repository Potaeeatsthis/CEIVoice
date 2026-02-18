// src/components/GlobalNotificationListener.tsx

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';

export default function GlobalNotificationListener({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!userId) return;

    const channel = supabaseBrowser
      .channel('global-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          const newComment = payload.new;

          // 1. Ignore my own messages
          if (newComment.user_id === userId) return;

          // 2. Dispatch event to update Sidebar/Table badges
          window.dispatchEvent(new CustomEvent('refresh-unread-stats'));

          // 3. Trigger Sonner Toast
          // Determine the redirect path based on current role (admin or user)
          const isUserAdmin = pathname?.startsWith('/admin');
          const targetUrl = isUserAdmin 
            ? `/admin/tickets/${newComment.ticket_id}` 
            : `/user/tickets/${newComment.ticket_id}`;

          toast(`Ticket #${newComment.ticket_id}`, {
            description: newComment.message || 'New message received',
            action: {
              label: 'View',
              onClick: () => router.push(targetUrl),
            },
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, router, pathname]);

  return null;
}
