// src/components/TicketDetailView.tsx

// src/components/TicketDetailView.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// -- Types --
type User = {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
};

type Comment = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_internal: boolean;
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
  created_by_user: { full_name: string; email: string };
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

export default function TicketDetailView({ ticket, comments, currentUser, allUsers, linkedTickets = [] }: TicketDetailViewProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modal States
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [ticketToUnlink, setTicketToUnlink] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // -- Form States --
  const [draftStatus, setDraftStatus] = useState<TicketStatus>(ticket.status);
  const [draftPriority, setDraftPriority] = useState(ticket.priority);
  const [draftAssignee, setDraftAssignee] = useState(ticket.assigned_to || '');
  const [draftDeadline, setDraftDeadline] = useState(ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '');
  // Category State
  const [draftCategory, setDraftCategory] = useState(ticket.category || 'General');

  const hasChanges = 
    draftStatus !== ticket.status || 
    draftPriority !== ticket.priority || 
    draftAssignee !== (ticket.assigned_to || '') ||
    draftCategory !== (ticket.category || 'General') ||
    draftDeadline !== (ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '');

  useEffect(() => {
    setDraftStatus(ticket.status);
    setDraftPriority(ticket.priority);
    setDraftAssignee(ticket.assigned_to || '');
    setDraftCategory(ticket.category || 'General');
    setDraftDeadline(ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '');
  }, [ticket]);

  const isStaff = currentUser.role === 'ADMIN' || currentUser.role === 'ASSIGNEE';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // -- Handlers --
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: commentText,
          is_internal: isStaff ? isInternal : false,
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');

      setCommentText('');
      setIsInternal(false);
      router.refresh(); 
    } catch (error) {
      alert('Failed to post comment');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsUpdating(true);
    try {
      const payload = {
        status: draftStatus,
        priority: draftPriority,
        category: draftCategory,
        assigned_to: draftAssignee || null,
        deadline: draftDeadline ? new Date(draftDeadline).toISOString() : null,
      };

      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update ticket');
      }
      
      router.refresh();
    } catch (error: any) {
      alert(`Error updating ticket: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
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
        body: JSON.stringify({ childTicketId: ticketToUnlink })
      });

      if (!res.ok) throw new Error('Unlink failed');

      router.refresh();
      setUnlinkModalOpen(false); 
      setTicketToUnlink(null);
    } catch (error) {
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
                </div>
             </div>
          </div>

          {comments.length > 0 && (
             <div className="relative flex items-center py-2">
               <div className="flex-grow border-t border-zinc-800"></div>
               <span className="flex-shrink-0 mx-4 text-xs text-zinc-600 font-medium uppercase tracking-wider">Discussion</span>
               <div className="flex-grow border-t border-zinc-800"></div>
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
                  {comment.user.full_name.charAt(0)}
                </div>
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {!isMe && <span className="text-xs font-medium text-zinc-400">{comment.user.full_name}</span>}
                    <span className="text-[10px] text-zinc-600">{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {isInternalNote && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-500 border border-amber-900/50 bg-amber-950/30 px-1.5 rounded">Internal</span>}
                  </div>
                  <div className={`px-4 py-2.5 shadow-sm text-sm whitespace-pre-wrap break-words border ${isInternalNote ? 'bg-amber-950/10 border-amber-900/40 text-amber-100 rounded-2xl' : isMe ? 'bg-zinc-900 border-zinc-800 text-zinc-300 rounded-2xl rounded-tr-none' : 'bg-zinc-700 border-zinc-600 text-white rounded-2xl rounded-tl-none'}`}>
                    {comment.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-zinc-900/30 border-t border-zinc-800">
          <form onSubmit={handleSendComment} className="relative">
             <div className="relative">
              <textarea
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:border-zinc-500 resize-none"
                rows={1}
                style={{ minHeight: '50px' }}
                placeholder="Type your message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSending || !commentText.trim()}
                className="absolute right-2 bottom-2 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
             </div>
             <div className="flex justify-between items-center mt-2">
                <div className="text-[10px] text-zinc-600">Press <span className="font-mono text-zinc-500">Enter</span> to send</div>
                {isStaff && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className={`w-3 h-3 rounded-full border ${isInternal ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'}`}></div>
                    <span className={`text-xs font-medium transition-colors ${isInternal ? 'text-amber-400' : 'text-zinc-500'}`}>Internal Note</span>
                    <input type="checkbox" className="hidden" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)}/>
                  </label>
                )}
             </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Controls */}
      <div className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ticket Controls</h3>
             {hasChanges && (
                <span className="text-[10px] font-bold text-amber-500 animate-pulse">Unsaved Changes</span>
             )}
          </div>
          
          <div className="space-y-5">
            {/* Status (with Arrow Icon) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Status</label>
              {isStaff ? (
                <div className="relative">
                  <select 
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as TicketStatus)}
                    disabled={isUpdating}
                    className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all appearance-none pr-8 cursor-pointer"
                  >
                    <option value="NEW">New</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="SOLVED">Solved</option>
                    <option value="FAILED">Failed</option>
                    <option value="MERGED">Merged</option>
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

            {/* Priority (Merged Icon + Dropdown) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Priority</label>
              {isStaff ? (
                <div className="relative group">
                  {/* Visual Interface */}
                  <div className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 flex items-center justify-between transition-all">
                     <PriorityDisplay priority={draftPriority} />
                     <div className="text-zinc-500">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                     </div>
                  </div>

                  {/* Hidden Dropdown Overlay */}
                  <select 
                    value={draftPriority}
                    onChange={(e) => setDraftPriority(e.target.value as any)}
                    disabled={isUpdating}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="LOW">Low (Normal)</option>
                    <option value="MEDIUM">Medium (Important)</option>
                    <option value="HIGH">High (Critical)</option>
                    <option value="URGENT">Urgent (Emergency)</option>
                  </select>
                </div>
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <PriorityDisplay priority={ticket.priority} />
                </div>
              )}
            </div>

            {/* Category (with Arrow Icon) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Category</label>
              {isStaff ? (
                <div className="relative">
                  <select 
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                    disabled={isUpdating}
                    className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all appearance-none pr-8 cursor-pointer"
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
                    disabled={isUpdating}
                    className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                  {allUsers.find(u => u.id === ticket.assigned_to)?.full_name || 'Unassigned'}
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
                   disabled={isUpdating}
                   className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-zinc-500/20 outline-none transition-all [color-scheme:dark]"
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
                disabled={isUpdating}
                className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {isUpdating ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                ) : (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                )}
                {isUpdating ? 'Saving...' : 'Update Ticket'}
              </button>
            )}
          </div>
        </div>

        {/* Linked Requests Sidebar Section */}
        {linkedTickets.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Linked Requests</h3>
                <span className="text-[10px] font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded-full">{linkedTickets.length}</span>
             </div>

             <div className="space-y-3">
               {linkedTickets.map(child => (
                 <div key={child.id} className="group bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 hover:bg-zinc-900 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white font-mono">#{child.id}</span>
                      <button 
                        onClick={() => promptUnlink(child.id)}
                        disabled={isUnlinking}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded"
                        title="Unlink and revert to NEW"
                      >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
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
           <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Info</h3>
           
           <div>
              <span className="block text-[10px] uppercase text-zinc-500 mb-1">Requester Email</span>
              <div className="text-sm text-zinc-300 break-all select-all flex items-center gap-2">
                <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                {ticket.created_by_user?.email}
              </div>
           </div>
        </div>
      </div>

      {/* Unlink Confirmation Modal */}
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
                  <span className="animate-spin h-4 w-4 border-2 border-red-500/30 border-t-red-500 rounded-full"></span>
                ) : (
                  'Unlink'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
