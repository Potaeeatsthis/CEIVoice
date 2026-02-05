// src/components/DraftEditor.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PriorityIcon from './PriorityIcon';
import Toast from './Toast';

type User = { id: string; full_name: string; role?: string; };
type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  deadline: string | null;
  created_at: string;
  assigned_to: string | null;
  created_by_user: { email: string };
};

export default function DraftEditor({ ticket, allUsers }: { ticket: Ticket; allUsers: User[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: ticket.title || '',
    description: ticket.description || '',
    priority: ticket.priority,
    category: ticket.category || 'General',
    deadline: ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '', 
    assigned_to: ticket.assigned_to || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAction = async (action: 'SAVE' | 'SUBMIT') => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: action === 'SUBMIT' ? 'NEW' : 'DRAFT',
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      };

      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save draft');

      if (action === 'SUBMIT') {
        router.push('/admin/tickets');
      } else {
        router.refresh();
        setToast({ msg: 'Draft changes saved successfully.', type: 'success' });
      }
    } catch (error) {
      setToast({ msg: 'Failed to save changes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full bg-black/20 border border-zinc-800 text-zinc-200 placeholder:text-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200";
  const labelBase = "flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1";
  const cardBase = "bg-zinc-900/30 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-6 shadow-sm";

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {toast && (
        <Toast 
          message={toast.msg} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-[10px] font-bold tracking-wider text-zinc-400 uppercase shadow-sm">
              Draft Mode
            </span>
            <span className="text-zinc-600 text-xs font-mono">#{ticket.id}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Review Draft
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Refine AI suggestions before creating the official ticket.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-950/50 p-1.5 rounded-xl border border-zinc-800/50 backdrop-blur-sm shadow-xl">
          <button 
            onClick={() => handleAction('SAVE')} 
            disabled={loading}
            className="px-5 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Save Changes
          </button>
          <button 
            onClick={() => handleAction('SUBMIT')} 
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Processing...' : (
                <>
                  Approve & Submit
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT: MAIN CONTENT (8 cols) --- */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`${cardBase} flex flex-col h-full`}>
            {/* Title Input */}
            <div className="mb-8">
               <label className={labelBase}>
                 <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 AI Suggested Title
               </label>
               <input 
                 type="text" 
                 value={formData.title} 
                 onChange={(e) => handleChange('title', e.target.value)}
                 className={`${inputBase} text-lg font-medium`}
                 placeholder="e.g. Database connection timeout..."
               />
            </div>

            {/* Description Input */}
            <div className="flex-1 flex flex-col">
              <label className={labelBase}>
                <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                Description & Details
              </label>
              <div className="relative flex-1">
                <textarea 
                  value={formData.description} 
                  onChange={(e) => handleChange('description', e.target.value)}
                  className={`${inputBase} font-mono text-sm leading-relaxed resize-none h-full`}
                />
                <div className="absolute bottom-4 right-4 text-[10px] text-zinc-600 font-mono pointer-events-none">
                  markdown supported
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT: SIDEBAR (4 cols) --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Metadata Card */}
          <div className={`${cardBase} space-y-6`}>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">
              Configuration
            </h3>

            {/* Priority Picker */}
            <div>
               <label className={labelBase}>Priority Level</label>
               <div className="bg-black/20 border border-zinc-800 rounded-xl p-2 relative group hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between px-3 py-2">
                    <PriorityIcon priority={formData.priority} />
                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <select 
                    value={formData.priority} 
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
               </div>
            </div>

            {/* Category */}
            <div>
               <label className={labelBase}>Category</label>
               <div className="relative">
                 <select 
                    value={formData.category} 
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={`${inputBase} appearance-none cursor-pointer`}
                 >
                    <option value="General">General Inquiry</option>
                    <option value="Network">Network & Connectivity</option>
                    <option value="Hardware">Hardware Issue</option>
                    <option value="Software">Software & Licensing</option>
                    <option value="Access">Access Control</option>
                 </select>
                 <div className="absolute right-4 top-4 pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                 </div>
               </div>
            </div>

            {/* Deadline */}
            <div>
               <label className={labelBase}>Target Deadline</label>
               <input 
                 type="date" 
                 value={formData.deadline} 
                 onChange={(e) => handleChange('deadline', e.target.value)}
                 className={`${inputBase} [color-scheme:dark]`} 
               />
            </div>

            {/* Assignee */}
            <div>
               <label className={labelBase}>Assignee</label>
               <div className="relative">
                 <select 
                    value={formData.assigned_to} 
                    onChange={(e) => handleChange('assigned_to', e.target.value)}
                    className={`${inputBase} appearance-none cursor-pointer`}
                 >
                    <option value="">-- Select Staff --</option>
                    {allUsers
			.filter((u) => u.role?.toUpperCase() === 'ASSIGNEE')
			.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                 </select>
                 <div className="absolute right-4 top-4 pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 </div>
               </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
             <div className="flex items-center justify-between gap-4">
               
               <div className="flex items-center gap-3 min-w-0">
                 <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0">
                   {ticket.created_by_user.email.charAt(0).toUpperCase()}
                 </div>
                 <div className="min-w-0">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Requested By</div>
                    <div className="text-sm text-zinc-200 truncate">{ticket.created_by_user.email}</div>
                 </div>
               </div>

               <div className="text-right shrink-0">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Submitted</div>
                  {/* ✨ UPDATED: Forced DD-MM-YYYY format */}
                  <div className="text-sm font-mono text-zinc-300">
                    {new Date(ticket.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }).replace(/\//g, '-')}
                  </div>
               </div>

             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
