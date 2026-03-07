// src/components/UserTicketDetailView.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';

type Comment = {
  id: string;
  user_id: string;
  message?: string;
  created_at: string;
  is_internal: boolean;
  attachments?: string[];
  user: { full_name: string };
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string | null;
  created_at: string;
  deadline: string | null;
  img?: string[];
  created_by_user?: { full_name: string; email: string } | null;
  ai_solution?: string | null;
};

type Props = {
  ticket: Ticket;
  initialComments: Comment[];
  currentUser: { id: string; name: string };
  isOwner: boolean; // true = personal ticket, false = community ticket being followed
};

const STATUS_STYLES: Record<string, string> = {
  NEW:         'bg-blue-950/40 text-blue-400 border-blue-900',
  IN_PROGRESS: 'bg-amber-950/40 text-amber-400 border-amber-900',
  SOLVED:      'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  FAILED:      'bg-red-950/40 text-red-400 border-red-900',
  MERGED:      'bg-purple-950/40 text-purple-400 border-purple-900',
  DRAFT:       'bg-zinc-900 text-zinc-500 border-zinc-800',
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH:   'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW:    'bg-emerald-500',
};

const PRIORITY_TEXT: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH:   'text-orange-400',
  MEDIUM: 'text-blue-400',
  LOW:    'text-emerald-400',
};

export default function UserTicketDetailView({ ticket, initialComments, currentUser, isOwner }: Props) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  const [comments,  setComments]  = useState<Comment[]>(initialComments);
  const [text,      setText]      = useState('');
  const [files,     setFiles]     = useState<File[]>([]);
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Scroll to bottom on new comment ───────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  // ── Real-time comment listener ─────────────────────────────────────────────
  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`ticket-comments-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'comments',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        async (payload) => {
          const newComment = payload.new as any;
          if (newComment.is_internal) return; // never show internal to users

          // Fetch the user name
          const { data: userData } = await supabaseBrowser
            .from('users')
            .select('full_name')
            .eq('id', newComment.user_id)
            .single();

          setComments((prev) => {
            // Avoid duplicates
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [
              ...prev,
              {
                ...newComment,
                user: { full_name: userData?.full_name || 'Support' },
              },
            ];
          });
        }
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [ticket.id]);

  // ── File upload to Supabase storage ───────────────────────────────────────
  const uploadFile = async (file: File): Promise<string> => {
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `ticket-uploads/${fileName}`;

    const { error } = await supabaseBrowser.storage
      .from('ticket-attachments')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage
      .from('ticket-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // ── Send comment ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;

    setSending(true);
    try {
      let attachmentUrls: string[] = [];

      if (files.length > 0) {
        setUploading(true);
        attachmentUrls = await Promise.all(files.map(uploadFile));
        setUploading(false);
      }

      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:     text.trim(),
          is_internal: false,
          attachments: attachmentUrls,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send');
      }

      setText('');
      setFiles([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const publicComments = comments.filter((c) => !c.is_internal);

  const priorityLevel = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[ticket.priority] ?? 1;

  return (
    <div className="flex gap-6 h-full">

      {/* ── Left: Chat ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">

        {/* Chat header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium text-zinc-400">
              {publicComments.length} message{publicComments.length !== 1 ? 's' : ''}
            </span>
          </div>
          {!isOwner && (
            <span className="text-[10px] text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              Community ticket
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0" style={{ maxHeight: '480px' }}>
          {publicComments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600">No messages yet</p>
              <p className="text-xs text-zinc-700 mt-1">Be the first to write something</p>
            </div>
          ) : (
            publicComments.map((comment) => {
              const isMine = comment.user_id === currentUser.id;
              return (
                <div key={comment.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold border
                    ${isMine
                      ? 'bg-blue-950 border-blue-900 text-blue-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    }`}>
                    {comment.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">
                        {comment.user?.full_name ?? 'Support'}
                      </span>
                      <span className="text-[10px] text-zinc-700">
                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isMine
                        ? 'bg-blue-600/20 border border-blue-900/60 text-blue-100 rounded-tr-sm'
                        : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 rounded-tl-sm'
                      }`}>
                      {comment.message}
                    </div>

                    {/* Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {comment.attachments.map((url, i) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                          return isImage ? (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="attachment" className="max-h-32 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors" />
                            </a>
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              Attachment
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 bg-zinc-900/30 px-4 py-3">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-full text-xs text-zinc-300">
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    className="text-zinc-500 hover:text-red-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
              title="Attach file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" className="hidden" multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                if (e.target.files) setFiles((p) => [...p, ...Array.from(e.target.files!)]);
              }}
            />

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message… (Enter to send)"
              rows={1}
              className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none leading-relaxed transition-all"
              style={{ minHeight: '40px', maxHeight: '160px' }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || (!text.trim() && files.length === 0)}
              className="flex-shrink-0 h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {sending || uploading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Info panel ──────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 space-y-4">

        {/* Status & Priority */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Status</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-semibold border ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.DRAFT}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Priority</span>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1 items-center">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= priorityLevel ? PRIORITY_DOT[ticket.priority] : 'bg-zinc-800'}`} />
                ))}
              </div>
              <span className={`text-xs font-semibold ${PRIORITY_TEXT[ticket.priority]}`}>
                {ticket.priority}
              </span>
            </div>
          </div>

          {ticket.category && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Category</span>
              <span className="text-xs text-zinc-300">{ticket.category}</span>
            </div>
          )}

          <div>
            <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Submitted</span>
            <span className="text-xs text-zinc-300">
              {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {ticket.deadline && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Deadline</span>
              <DeadlineDisplay deadline={ticket.deadline} />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Description</span>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
            {ticket.description}
          </p>
        </div>

        {/* Ticket images */}
        {ticket.img && ticket.img.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Attachments</span>
            <div className="space-y-2">
              {ticket.img.map((url, i) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                return isImage ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`attachment-${i}`} className="w-full rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors" />
                  </a>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachment {i + 1}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Solution */}
        {ticket.ai_solution && (
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">AI Suggestion</span>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">{ticket.ai_solution}</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Quick Actions</span>
          <div className="space-y-1">
            <button
              onClick={() => { navigator.clipboard.writeText(String(ticket.id)); toast.success('Ticket ID copied'); }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Copy Ticket ID
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deadline display helper ────────────────────────────────────────────────────

function DeadlineDisplay({ deadline }: { deadline: string }) {
  const now      = new Date(); now.setHours(0,0,0,0);
  const due      = new Date(deadline); due.setHours(0,0,0,0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);

  const label = diffDays < 0
    ? <span className="text-red-400 font-medium">Overdue</span>
    : diffDays === 0
    ? <span className="text-amber-400 font-medium">Due today</span>
    : diffDays === 1
    ? <span className="text-amber-400 font-medium">Due tomorrow</span>
    : diffDays < 7
    ? <span className="text-amber-400 font-medium">{diffDays} days left</span>
    : <span className="text-zinc-300">{diffDays} days left</span>;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-300">
        {new Date(deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}
