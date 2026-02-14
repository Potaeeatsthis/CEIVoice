// src/components/GlobalNotificationListener.tsx

'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner'; // Ensure you have installed 'sonner' or use your preferred toast lib
import { useRouter } from 'next/navigation';

export default function GlobalNotificationListener({ userId }: { userId: string }) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    // Listen to ALL new comments
    const channel = supabase
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

          // 1. Ignore my own comments
          if (newComment.user_id === userId) return;

          // 2. (Optional) Check if I am actually involved in this ticket
          // For MVP, we can just show the notification if we are listening.
          // In a real app, you might want to filter this by checking if newComment.ticket_id belongs to me.
          
          // Show Banner
          toast.message('New Message Received', {
            description: newComment.message.substring(0, 50) + '...',
            action: {
              label: 'View',
              onClick: () => router.push(`/user/tickets/${newComment.ticket_id}`)
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);

  return null; // This component renders nothing visually, just logic
}
