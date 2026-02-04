// src/components/MergeTicketModal.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MergeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicketIds: number[];
  onSuccess: () => void;
}

export default function MergeTicketModal({ isOpen, onClose, selectedTicketIds, onSuccess }: MergeTicketModalProps) {
  const router = useRouter();
  
  // Form State for the NEW Consolidated Ticket
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);

  // If not open, don't render anything
  if (!isOpen) return null;

  const handleMerge = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Please provide a Title and Summary for the new ticket.');
      return;
    }
    
    setLoading(true);
    try {
      // ✅ FIX: Use the correct endpoint '/api/admin/merge'
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: selectedTicketIds,
          title,
          description,
          priority
        })
      });

      if (!res.ok) {
        // Safe error handling to avoid JSON parse crashes on 404s
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const err = await res.json();
          throw new Error(err.error || 'Merge failed');
        } else {
          throw new Error(`Server returned ${res.status} ${res.statusText}`);
        }
      }

      // Success Logic
      onSuccess(); // Triggers table refresh
      onClose();   // Closes modal
      router.refresh(); 

    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* --- Header --- */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">Merge Tickets</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Consolidating <span className="text-emerald-400 font-mono font-bold">{selectedTicketIds.length}</span> tickets into a new Draft.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* --- Body --- */}
        <div className="p-6 space-y-5">
          
          {/* Title Input */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              New Master Title
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Consolidated Network Issues - Floor 2"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Summary & Reason
            </label>
            <textarea 
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the common issue linking these tickets..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-zinc-600"
            />
          </div>

          {/* Priority Select */}
          <div>
             <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
               Priority Level
             </label>
             <div className="relative">
               <select 
                 value={priority} 
                 onChange={(e) => setPriority(e.target.value)}
                 className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-8 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-emerald-500/50 cursor-pointer"
               >
                 <option value="LOW">Low</option>
                 <option value="MEDIUM">Medium</option>
                 <option value="HIGH">High</option>
                 <option value="URGENT">Urgent</option>
               </select>
               {/* Custom Arrow */}
               <div className="absolute right-3 top-3 pointer-events-none text-zinc-500">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
               </div>
             </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="px-6 py-4 bg-zinc-900/30 border-t border-zinc-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleMerge}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3 w-3 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Merging...
              </>
            ) : (
              'Confirm Merge'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
