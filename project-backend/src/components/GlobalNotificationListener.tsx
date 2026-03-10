// src/components/GlobalNotificationListener.tsx

'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';

export default function GlobalNotificationListener({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { routerRef.current = router; }, [router]);

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

          // 2. Ignore internal messages — these are only for admins/assignees
          if (newComment.is_internal) return;

          // 3. Dispatch event to update Sidebar/Table badges
          window.dispatchEvent(new CustomEvent('refresh-unread-stats'));

          // 4. Trigger Sonner Toast
          const currentPath = pathnameRef.current;
          const isUserAdmin = currentPath?.startsWith('/admin');
          const isUserAssignee = currentPath?.startsWith('/assignee');

          let targetUrl = `/tickets/${newComment.ticket_id}`;
          if (isUserAdmin) targetUrl = `/admin/tickets/${newComment.ticket_id}`;
          if (isUserAssignee) targetUrl = `/assignee/tickets/${newComment.ticket_id}`;

          toast(`Ticket #${newComment.ticket_id}`, {
            description: newComment.message || 'New message received',
            action: {
              label: 'View',
              onClick: () => routerRef.current.push(targetUrl),
            },
            duration: 5000,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Global notification realtime status:', status);
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId]);

  return null;
}