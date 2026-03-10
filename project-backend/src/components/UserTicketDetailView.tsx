// src/components/UserTicketDetailView.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';

type Comment = {
  id: string;
  user_id: string;
  message?: string;
  content?: string;
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
  isOwner: boolean;
  isFollowing?: boolean;
  isGuest?: boolean;
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

function AttachmentPreview({ url }: { url: string }) {
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt="attachment" className="max-h-48 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors w-fit">
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span className="text-xs text-blue-400 underline">View Attachment</span>
    </a>
  );
}

export default function UserTicketDetailView({ ticket, initialComments, currentUser, isOwner, isFollowing, isGuest = false }: Props) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  const [comments,  setComments]  = useState<Comment[]>(initialComments);
  const [text,      setText]      = useState('');
  const [files,     setFiles]     = useState<File[]>([]);
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);

  const canComment = !isGuest && (isOwner || isFollowing);

  useEffect(() => {
    if (isGuest) return;
    const markAsRead = async () => {
      if (!ticket.id || !currentUser.id) return;
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/read`, { method: 'POST' });
        if (res.ok) {
          setTimeout(() => window.dispatchEvent(new Event('refresh-unread-stats')), 300);
        }
      } catch (err) {
        console.error('Failed to mark ticket as read:', err);
      }
    };
    markAsRead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, currentUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (isGuest) return;
    const channel = supabaseBrowser
      .channel(`ticket-comments-${ticket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticket.id}` },
        async (payload) => {
          const newComment = payload.new as any;
          if (newComment.is_internal) return;
          const { data: userData } = await supabaseBrowser.from('users').select('full_name').eq('id', newComment.user_id).single();
          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [...prev, { ...newComment, user: { full_name: userData?.full_name || 'Support' } }];
          });
        }
      ).subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const uploadFile = async (file: File): Promise<string> => {
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `ticket-uploads/${fileName}`;
    const { error } = await supabaseBrowser.storage.from('ticket-attachments').upload(filePath, file);
    if (error) throw error;
    const { data } = supabaseBrowser.storage.from('ticket-attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

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
      const payload: any = { message: text.trim(), content: text.trim(), is_internal: false };
      if (attachmentUrls.length > 0) payload.attachments = attachmentUrls;
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to send'); }
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const publicComments = comments.filter((c) => !c.is_internal);
  const priorityLevel = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[ticket.priority] ?? 1;

  return (
    <div className="flex gap-6 h-full min-h-0">

      {/* ── Left: Chat ── */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm z-10">
          <h2 className="text-lg font-semibold text-white truncate">{ticket.title || 'Untitled Ticket'}</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <span>Requested by {ticket.created_by_user?.full_name || 'User'}</span>
            <span>•</span>
            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            {!isOwner && !isGuest && (
              <><span>•</span><span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-300 text-[10px] uppercase tracking-wide">Community</span></>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-black/20 min-h-0">

          {/* Original request */}
          <div className={`flex gap-3 ${isOwner ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${isOwner ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'}`}>
              {ticket.created_by_user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={`flex flex-col max-w-[85%] ${isOwner ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1">
                {!isOwner && <span className="text-sm font-medium text-zinc-300">{ticket.created_by_user?.full_name || 'User'}</span>}
                <span className="text-[10px] text-zinc-600">Original Request</span>
              </div>
              <div className={`bg-zinc-800/50 border border-zinc-700/50 rounded-2xl px-4 py-3 text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap ${isOwner ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                {ticket.description}
                {ticket.img && ticket.img.map((url, idx) => <AttachmentPreview key={idx} url={url} />)}
              </div>
            </div>
          </div>

          {publicComments.length > 0 && (
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="flex-shrink-0 mx-4 text-xs text-zinc-600 font-medium uppercase tracking-wider">Discussion</span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>
          )}

          {publicComments.map((comment) => {
            const isMine = comment.user_id === currentUser.id;
            const displayMessage = comment.message || comment.content;
            return (
              <div key={comment.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${isMine ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
                  {comment.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {!isMine && <span className="text-xs font-medium text-zinc-400">{comment.user?.full_name ?? 'Support'}</span>}
                    <span className="text-[10px] text-zinc-600">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {displayMessage && displayMessage.trim().length > 0 && (
                    <div className={`px-4 py-2.5 shadow-sm text-sm whitespace-pre-wrap break-words border ${isMine ? 'bg-zinc-900 border-zinc-800 text-zinc-300 rounded-2xl rounded-tr-none' : 'bg-zinc-700 border-zinc-600 text-white rounded-2xl rounded-tl-none'}`}>
                      {displayMessage}
                    </div>
                  )}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {comment.attachments.map((url, i) => <AttachmentPreview key={i} url={url} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input area — guest sees sign-in prompt, others see message box */}
        {isGuest ? (
          <div className="p-4 bg-zinc-900/30 border-t border-zinc-800 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Sign in to reply to this ticket and receive updates.</p>
            <Link
              href={`/login?redirect=/tickets/${ticket.id}`}
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Sign In to Reply
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-zinc-900/30 border-t border-zinc-800">
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-300 border border-zinc-700 animate-in zoom-in duration-200">
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-white">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex gap-2 items-end">
              <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => { if (e.target.files) setFiles((p) => [...p, ...Array.from(e.target.files!)]); }}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canComment}
                className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors h-[46px] disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <div className="relative flex-1">
                <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
                  disabled={!canComment}
                  placeholder={canComment ? "Type your message..." : "Follow this ticket to join the conversation."}
                  rows={1}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:border-zinc-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ minHeight: '46px', maxHeight: '160px' }}
                />
                <button type="button" onClick={handleSend} disabled={sending || (!text.trim() && files.length === 0) || !canComment}
                  className="absolute right-2 bottom-2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                  {sending || uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2 pl-[52px]">
              <div className="text-[10px] text-zinc-600">Press <span className="font-mono text-zinc-500">Enter</span> to send</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Info panel ── */}
      <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">

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
              <span className={`text-xs font-semibold ${PRIORITY_TEXT[ticket.priority]}`}>{ticket.priority}</span>
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Description</span>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">{ticket.description}</p>
        </div>

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

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Quick Actions</span>
          <div className="space-y-1">
            <button onClick={() => { navigator.clipboard.writeText(String(ticket.id)); toast.success('Ticket ID copied'); }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Copy Ticket ID
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors flex items-center gap-2">
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

function DeadlineDisplay({ deadline }: { deadline: string }) {
  const now      = new Date(); now.setHours(0,0,0,0);
  const due      = new Date(deadline); due.setHours(0,0,0,0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);

  const label = diffDays < 0
    ? <span className="text-red-400 font-medium">Overdue</span>
    : diffDays === 0 ? <span className="text-amber-400 font-medium">Due today</span>
    : diffDays === 1 ? <span className="text-amber-400 font-medium">Due tomorrow</span>
    : diffDays < 7  ? <span className="text-amber-400 font-medium">{diffDays} days left</span>
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