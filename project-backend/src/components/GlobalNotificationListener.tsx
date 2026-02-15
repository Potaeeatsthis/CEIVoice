// src/components/GlobalNotificationListener.tsx

'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function GlobalNotificationListener({ userId }: { userId: string }) {
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

          // 2. Dispatch Custom Event (This triggers your Toast.tsx)
          const event = new CustomEvent('show-toast', {
            detail: {
              message: newComment.message,
              ticketId: newComment.ticket_id,
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
