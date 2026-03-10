// src/components/TicketDetailView.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

type User = {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
};

type Comment = {
  id: string;
  user_id: string;
  message?: string;
  content?: string;
  created_at: string;
  is_internal: boolean;
  attachments?: string[];
  user: {
    full_name: string;
  };
};

type TicketStatus = 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED' | 'MERGED';

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  deadline: string | null;
  created_at: string;
  assigned_to: string | null;
  img?: string[];
  created_by_user: { full_name: string; email: string };
  ai_solution?: string | null;
  failure_reason?: string | null;
};

type LinkedTicket = {
  id: string;
  title: string;
  status: string;
  created_by_user: { email: string };
};

interface TicketDetailViewProps {
  ticket: Ticket;
  comments: Comment[];
  currentUser: { id: string; role: string };
  allUsers: User[];
  linkedTickets?: LinkedTicket[];
}

function PriorityDisplay({ priority }: { priority: string }) {
  const getLevel = () => {
    switch (priority) {
      case 'URGENT': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      default: return 1;
    }
  };

  const getColor = () => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-blue-500';
      default: return 'bg-emerald-500';
    }
  };

  const getTextColor = () => {
    switch (priority) {
      case 'URGENT': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MEDIUM': return 'text-blue-400';
      default: return 'text-emerald-400';
    }
  };

  const level = getLevel();

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 h-3 items-center">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 
              ${i <= level ? getColor() : 'bg-zinc-800'} 
              ${priority === 'URGENT' && i <= level ? 'animate-pulse' : ''}
            `}
          />
        ))}
      </div>
      <span className={`text-sm font-bold tracking-wide ${getTextColor()}`}>
        {priority}
      </span>
    </div>
  );
}

function getOriginalFileName(url: string, fallbackIndex: number): string {
  const rawName = decodeURIComponent(url.split('/').pop() || '');
  const underscoreIdx = rawName.indexOf('_');
  return underscoreIdx !== -1 ? rawName.slice(underscoreIdx + 1) : `Attachment ${fallbackIndex + 1}`;
}

function AttachmentPreview({ url, index = 0 }: { url: string; index?: number }) {
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
  const fileName = getOriginalFileName(url, index);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={url}
          alt={fileName}
          className="max-h-48 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
        />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors w-fit">
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span className="text-xs text-blue-400 underline">{fileName}</span>
    </a>
  );
}

export default function TicketDetailView({ ticket, comments, currentUser, allUsers, linkedTickets = [] }: TicketDetailViewProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Modal States
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [ticketToUnlink, setTicketToUnlink] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // SOLVED / FAILED Modals (From origin/private/in)
  const [showSolvedModal, setShowSolvedModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [resolutionSteps, setResolutionSteps] = useState<string[]>(['']);
  const [failureReason, setFailureReason] = useState('');

  // Form States
  const [draftStatus, setDraftStatus] = useState<TicketStatus>(ticket.status);
  const [draftPriority, setDraftPriority] = useState(ticket.priority);
  const [draftAssignee, setDraftAssignee] = useState(ticket.assigned_to || '');
  const [draftDeadline, setDraftDeadline] = useState(
    ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : ''
  );
  const [draftCategory, setDraftCategory] = useState(ticket.category || 'General');

  const hasChanges =
    draftStatus !== ticket.status ||
    draftPriority !== ticket.priority ||
    draftAssignee !== (ticket.assigned_to || '') ||
    draftCategory !== (ticket.category || 'General') ||
    draftDeadline !== (ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '');

  const isStaff = currentUser.role === 'ADMIN' || currentUser.role === 'ASSIGNEE';
  const isAdmin = currentUser.role === 'ADMIN';

  const isLocked = ticket.status === 'SOLVED' || (ticket.status === 'FAILED' && !!ticket.failure_reason);

  const isAssignee = ticket.assigned_to === currentUser.id;

  useEffect(() => {
    const markAsRead = async () => {
      if (!ticket.id) return;
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/read`, { method: 'POST' });
        if (!res.ok) {
          console.error('Failed to mark ticket as read:', await res.text());
        } else {
          setTimeout(() => {
            window.dispatchEvent(new Event('refresh-unread-stats'));
            router.refresh();
          }, 300);
        }
      } catch (err) {
        console.error('Failed to mark ticket as read:', err);
      }
    };
    markAsRead();
  }, [ticket.id, currentUser.id, router]);

  useEffect(() => {
    setDraftStatus(ticket.status);
    setDraftPriority(ticket.priority);
    setDraftAssignee(ticket.assigned_to || '');
    setDraftCategory(ticket.category || 'General');
    setDraftDeadline(ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '');
  }, [ticket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (
      ticket.status === 'FAILED' &&
      !ticket.failure_reason &&
      isAssignee
    ) {
      setShowFailedModal(true);
    }
  }, [ticket.status, ticket.failure_reason, isAssignee]);

  useEffect(() => {
    if (showSolvedModal) {
      setResolutionSteps(['']);
    }
  }, [showSolvedModal]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, value: string) => {
    setResolutionSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const addStep = () => {
    if (resolutionSteps.length < 4) {
      setResolutionSteps((prev) => [...prev, '']);
    }
  };

  const removeStep = (index: number) => {
    if (resolutionSteps.length > 1) {
      setResolutionSteps((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const uploadAttachmentToBucket = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `chat-uploads/${fileName}`;

    const { error } = await supabaseBrowser.storage
      .from('ticket-attachments')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage
      .from('ticket-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && attachments.length === 0) return;

    setIsSending(true);
    setUploadingFile(true);

    try {
      let uploadedUrls: string[] = [];

      if (attachments.length > 0) {
        uploadedUrls = await Promise.all(attachments.map((file) => uploadAttachmentToBucket(file)));
      }

      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: commentText,
          is_internal: isStaff ? isInternal : false,
          attachments: uploadedUrls,
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');

      setCommentText('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsInternal(false);
      router.refresh();
    } catch {
      alert('Failed to post comment');
    } finally {
      setIsSending(false);
      setUploadingFile(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsUpdating(true);
    try {
      const payload: any = {};

      if (draftStatus !== ticket.status) payload.status = draftStatus;
      if (draftPriority !== ticket.priority) payload.priority = draftPriority;
      if (draftCategory !== (ticket.category || 'General')) payload.category = draftCategory;
      if (draftAssignee !== (ticket.assigned_to || '')) payload.assigned_to = draftAssignee || null;

      const originalDeadline = ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '';
      if (draftDeadline !== originalDeadline) {
        payload.deadline = draftDeadline ? new Date(draftDeadline).toISOString() : null;
      }

      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      router.refresh();
    } catch (error: any) {
      alert(`Error updating ticket: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmSolved = async () => {
    const finalResolutionText = resolutionSteps
      .filter(step => step.trim() !== '')
      .map((step, index) => `${index + 1}. ${step.trim()}`)
      .join('\n');
    if (!finalResolutionText) { alert('Please enter final resolution'); return; }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SOLVED', ai_solution: finalResolutionText }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update ticket'); }
      setShowSolvedModal(false);
      setResolutionSteps(['']);
      router.refresh();
    } catch (error: any) { alert(error.message); } finally { setIsUpdating(false); }
  };

  const confirmFailedStatus = async () => {
    if (!failureReason.trim()) { alert('Please enter failure reason'); return; }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FAILED', failure_reason: failureReason }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update ticket'); }
      setShowFailedModal(false);
      setFailureReason('');
      setDraftStatus('FAILED');
      router.refresh();
    } catch (error: any) { alert(error.message); } finally { setIsUpdating(false); }
  };

  const promptUnlink = (childId: string) => {
    setTicketToUnlink(childId);
    setUnlinkModalOpen(true);
  };

  const executeUnlink = async () => {
    if (!ticketToUnlink) return;
    setIsUnlinking(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childTicketId: ticketToUnlink }),
      });
      if (!res.ok) throw new Error('Unlink failed');
      router.refresh();
      setUnlinkModalOpen(false);
      setTicketToUnlink(null);
    } catch {
      alert('Failed to unlink ticket');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] relative">

      {/* LEFT COLUMN */}
      <div className="lg:col-span-2 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm z-10">
          <h2 className="text-lg font-semibold text-white truncate">{ticket.title}</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <span>Requested by {ticket.created_by_user?.full_name}</span>
            <span>•</span>
            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-black/20">

          {/* ORIGINAL REQUEST */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
              {ticket.created_by_user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col max-w-[85%]">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-zinc-300">{ticket.created_by_user?.full_name}</span>
                <span className="text-[10px] text-zinc-600">Original Request</span>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl rounded-tl-none px-4 py-3 text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.description}
                {ticket.img && ticket.img.map((url, idx) => (
                  <AttachmentPreview key={idx} url={url} index={idx} />
                ))}
              </div>
            </div>
          </div>

          {comments.length > 0 && (
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="flex-shrink-0 mx-4 text-xs text-zinc-600 font-medium uppercase tracking-wider">Discussion</span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>
          )}

          {comments.map((comment) => {
            if (comment.is_internal && !isStaff) return null;
            const isMe = comment.user_id === currentUser.id;
            const isInternalNote = comment.is_internal;

            return (
              <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border
                  ${isInternalNote ? 'bg-amber-900/20 border-amber-600/40 text-amber-500' : isMe ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
                  {(comment.user?.full_name ?? 'Anonymous').charAt(0)}
                </div>
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {!isMe && <span className="text-xs font-medium text-zinc-400">{comment.user?.full_name ?? 'Anonymous'}</span>}
                    <span className="text-[10px] text-zinc-600">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isInternalNote && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-500 border border-amber-900/50 bg-amber-950/30 px-1.5 rounded">Internal</span>}
                  </div>
                  <div className={`px-4 py-2.5 shadow-sm text-sm whitespace-pre-wrap break-words border ${isInternalNote ? 'bg-amber-950/10 border-amber-900/40 text-amber-100 rounded-2xl' : isMe ? 'bg-zinc-900 border-zinc-800 text-zinc-300 rounded-2xl rounded-tr-none' : 'bg-zinc-700 border-zinc-600 text-white rounded-2xl rounded-tl-none'}`}>
                    {comment.content || comment.message}
                    {comment.attachments && comment.attachments.map((url, idx) => (
                      <AttachmentPreview key={idx} url={url} index={idx} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* FINAL RESOLUTION OR FAILURE REASON DISPLAY */}
          {ticket.status === 'SOLVED' && ticket.ai_solution && (
            <div className={`flex gap-3 ${isAssignee ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center text-xs font-bold">
                {allUsers.find(u => u.id === ticket.assigned_to)?.full_name?.charAt(0) || 'A'}
              </div>
              <div className={`flex flex-col max-w-[75%] ${isAssignee ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isAssignee && <span className="text-xs font-medium text-zinc-400">
                    {allUsers.find(u => u.id === ticket.assigned_to)?.full_name || 'Assignee'}
                  </span>}
                  <span className="text-[10px] text-zinc-600">Final Resolution</span>
                </div>
                <div className={`px-4 py-2.5 bg-emerald-900/30 border border-emerald-700 text-emerald-200 rounded-2xl text-sm whitespace-pre-wrap ${isAssignee ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                  {ticket.ai_solution}
                </div>
              </div>
            </div>
          )}
          {ticket.status === 'FAILED' && ticket.failure_reason && (
            <div className={`flex gap-3 ${isAssignee ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center text-xs font-bold">
                {allUsers.find(u => u.id === ticket.assigned_to)?.full_name?.charAt(0) || 'A'}
              </div>
              <div className={`flex flex-col max-w-[75%] ${isAssignee ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isAssignee && <span className="text-xs font-medium text-zinc-400">
                    {allUsers.find(u => u.id === ticket.assigned_to)?.full_name || 'Assignee'}
                  </span>}
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wide">Failure Reason</span>
                </div>
                <div className={`px-4 py-2.5 bg-red-900/30 border border-red-700 text-red-200 rounded-2xl text-sm whitespace-pre-wrap ${isAssignee ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                  {ticket.failure_reason}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-900/30 border-t border-zinc-800">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-300 border border-zinc-700 animate-in zoom-in duration-200">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeAttachment(idx)} className="text-zinc-500 hover:text-white">✕</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendComment} className="relative flex gap-2 items-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors h-[46px]"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <div className="relative flex-1">
              <textarea
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:border-zinc-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
                style={{ minHeight: '46px' }}
                placeholder="Type your message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isLocked}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSending || (!commentText.trim() && attachments.length === 0) || isLocked}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                {isSending || uploadingFile ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="flex justify-between items-center mt-2 pl-[52px]">
            <div className="text-[10px] text-zinc-600">Press <span className="font-mono text-zinc-500">Enter</span> to send</div>
            {isStaff && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={`w-3 h-3 rounded-full border ${isInternal ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'}`} />
                <span className={`text-xs font-medium transition-colors ${isInternal ? 'text-amber-400' : 'text-zinc-500'}`}>Internal Note</span>
                <input type="checkbox" className="hidden" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-6 overflow-y-auto pr-1">
        
        {/* SECTION 1: Ticket Controls */}
        {!isLocked && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ticket Controls</h3>
            {hasChanges && (
              <span className="text-[10px] font-bold text-amber-500 animate-pulse">Unsaved Changes</span>
            )}
          </div>

          <div className="space-y-5">
            {/* Status */}
            {!isAdmin && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Status</label>
                {isStaff ? (
                  <div className="relative">
                    <select 
                      value={draftStatus}
                      onChange={(e) => {
                        const value = e.target.value as TicketStatus;
                        if (value === 'SOLVED') { setShowSolvedModal(true); return; }
                        if (value === 'FAILED') { setShowFailedModal(true); return; }
                        setDraftStatus(value);
                      }}
                      disabled={isUpdating || isLocked}
                      className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="NEW">New</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="SOLVED">Solved</option>
                      <option value="FAILED">Failed</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300">
                    {ticket.status.replace('_', ' ')}
                  </div>
                )}
              </div>
            )}

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Priority</label>
              {isStaff ? (
                <div className="relative group">
                  <div className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 flex items-center justify-between transition-all">
                     <PriorityDisplay priority={draftPriority} />
                     <div className="text-zinc-500">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                     </div>
                  </div>
                  <select 
                    value={draftPriority}
                    onChange={(e) => setDraftPriority(e.target.value as any)}
                    disabled={isUpdating || isLocked}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <PriorityDisplay priority={ticket.priority} />
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Category</label>
              {isAdmin ? (
                <div className="relative">
                  <select 
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                    disabled={isUpdating || isLocked}
                    className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="General">General Inquiry</option>
                    <option value="Network">Network & Connectivity</option>
                    <option value="Hardware">Hardware Issue</option>
                    <option value="Software">Software & Licensing</option>
                    <option value="Access">Access Control</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300">
                  {ticket.category || 'General'}
                </div>
              )}
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Assignee</label>
              {isStaff ? (
                <div className="relative">
                  <select 
                    value={draftAssignee}
                    onChange={(e) => setDraftAssignee(e.target.value)}
                    disabled={isUpdating || isLocked}
                    className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                  {allUsers.find((u) => u.id === ticket.assigned_to)?.full_name || 'Unassigned'}
                </div>
              )}
            </div>

            {/* Deadline Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Target Deadline</label>
              {isStaff ? (
                <input
                  type="date"
                  value={draftDeadline}
                  onChange={(e) => setDraftDeadline(e.target.value)}
                  disabled={isUpdating || isLocked}
                  className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all [color-scheme:dark] disabled:cursor-not-allowed"
                />
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300">
                   {ticket.deadline ? new Date(ticket.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'No Deadline'}
                </div>
              )}
            </div>

            {isStaff && hasChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={isUpdating || isLocked}
                className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {isUpdating ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isUpdating ? 'Saving...' : 'Update Ticket'}
              </button>
            )}
          </div>
        </div>
        )}

        {/* SECTION 2: Linked Requests */}
        {linkedTickets.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Linked Requests</h3>
              <span className="text-[10px] font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded-full">{linkedTickets.length}</span>
            </div>
            <div className="space-y-3">
              {linkedTickets.map((child) => (
                <div key={child.id} className="group bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 hover:bg-zinc-900 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-white font-mono">#{child.id}</span>
                    <button
                      onClick={() => promptUnlink(child.id)}
                      disabled={isUnlinking}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded"
                      title="Unlink and revert to NEW"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-zinc-300 truncate mb-1">{child.title}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{child.created_by_user?.email}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INFO BOX */}
        <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Ticket Details</h3>

          <div>
            <span className="block text-[10px] uppercase text-zinc-500 mb-1">Requester Email</span>
            <div className="text-sm text-zinc-300 break-all select-all flex items-center gap-2">
              <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {ticket.created_by_user?.email}
            </div>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-zinc-500 mb-1">Created</span>
            <div className="text-sm text-zinc-300 flex items-center gap-2">
              <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(ticket.created_at).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {ticket.img && ticket.img.length > 0 && (
            <div>
              <span className="block text-[10px] uppercase text-zinc-500 mb-1">Attachments</span>
              <div className="text-sm text-zinc-300 flex items-center gap-2">
                <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {ticket.img.length} {ticket.img.length === 1 ? 'file' : 'files'}
              </div>
            </div>
          )}

          {ticket.deadline && (
            <div>
              <span className="block text-[10px] uppercase text-zinc-500 mb-1">Time Remaining</span>
              <div className="text-sm text-zinc-300 flex items-center gap-2">
                <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(() => {
                  const now = new Date();
                  const deadline = new Date(ticket.deadline);
                  now.setHours(0, 0, 0, 0);
                  deadline.setHours(0, 0, 0, 0);
                  const diffMs = deadline.getTime() - now.getTime();
                  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

                  if (diffMs < 0) return <span className="text-red-400 font-medium">Overdue</span>;
                  if (diffDays === 0) return <span className="text-amber-400 font-medium">Due today</span>;
                  if (diffDays === 1) return <span className="text-amber-400 font-medium">Due tomorrow</span>;
                  if (diffDays < 7) return <span className="text-amber-400 font-medium">{diffDays} days left</span>;
                  return `${diffDays} days left`;
                })()}
              </div>
            </div>
          )}

          {isLocked && (
            <>
              <div>
                <span className="block text-[10px] uppercase text-zinc-500 mb-1">Closed at</span>
                <div className="text-sm text-zinc-300 flex items-center gap-2">
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(ticket.deadline).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric',
                  })}
                  </div>
              </div>

              <div>
                <span className="block text-[10px] uppercase text-zinc-500 mb-1">Status</span>
                <div className="text-sm text-zinc-300 flex items-center gap-2">
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {ticket.status.replace('_', ' ')}
                </div>
              </div>

              <div>
                <span className="block text-[10px] uppercase text-zinc-500 mb-1">Assignee</span>
                <div className="text-sm text-zinc-300 flex items-center gap-2">
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
                  </svg>
                    {allUsers.find(u => u.id === ticket.assigned_to)?.full_name || 'Unassigned'}
                </div>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-zinc-800">
            <span className="block text-[10px] uppercase text-zinc-500 mb-2">Quick Actions</span>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => navigator.clipboard.writeText(ticket.id)}
                className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Ticket ID
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Copy Link
              </button>
            </div>
          </div>
        </div>
        
      {/* Unlink Modal */}
      {unlinkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 mb-4">
                <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Unlink Ticket?</h3>
              <p className="text-sm text-zinc-400">
                Are you sure you want to remove this ticket from the group?
                It will revert to <span className="text-blue-400 font-bold">NEW</span> status.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-zinc-800 border-t border-zinc-800">
              <button
                onClick={() => setUnlinkModalOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-medium py-3.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeUnlink}
                disabled={isUnlinking}
                className="bg-zinc-900 hover:bg-red-900/20 text-red-400 hover:text-red-300 text-sm font-bold py-3.5 transition-colors flex items-center justify-center gap-2"
              >
                {isUnlinking ? (
                  <span className="animate-spin h-4 w-4 border-2 border-red-500/30 border-t-red-500 rounded-full" />
                ) : 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solved Modal */}
      {showSolvedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Final Resolution</h3>
            <div className="space-y-2">
              {resolutionSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400 w-5 shrink-0">{index + 1}.</span>
                  <input
                    type="text"
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder={`Step ${index + 1}...`}
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                  />
                  {resolutionSteps.length > 1 && (
                    <button
                      onClick={() => removeStep(index)}
                      className="text-zinc-500 hover:text-red-400 transition-colors px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {resolutionSteps.length < 4 && (
              <button
                onClick={addStep}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                + Add Step
              </button>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={confirmSolved} disabled={isUpdating || resolutionSteps.every(s => !s.trim())} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                {isUpdating && <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>}
                Confirm Solved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Reason Required
            </h3>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
              rows={6}
              placeholder="Enter reason for marking this ticket as failed..."
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={confirmFailedStatus} disabled={isUpdating || !failureReason.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                {isUpdating && <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>}
                Confirm Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
