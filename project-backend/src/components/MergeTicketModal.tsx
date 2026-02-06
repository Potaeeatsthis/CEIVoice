// src/components/MergeTicketModal.tsx

'use client';

import { useState } from 'react';

interface MergeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicketIds: number[];
  onSuccess: () => void;
}

export default function MergeTicketModal({ isOpen, onClose, selectedTicketIds, onSuccess }: MergeTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✨ New: Custom Error State (No more browser alerts!)
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // 1. Validate Input
    if (!title.trim() || !description.trim()) {
      setError("Please provide a Title and Summary for the new ticket.");
      return;
    }

    setIsSubmitting(true);
    setError(null); // Clear previous errors

    try {
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

      if (!res.ok) throw new Error('Merge failed');

      onSuccess();
    } catch (err) {
      setError("Failed to merge tickets. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
            <div>
                <h3 className="text-lg font-bold text-white">Merge Tickets</h3>
                <p className="text-xs text-zinc-400 mt-1">
                    Consolidating <span className="text-emerald-400 font-bold">{selectedTicketIds.length}</span> tickets into a new Draft.
                </p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
            
            {/* ✨ Beautiful Error Banner */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">New Master Title</label>
                <input 
                    className={`w-full bg-zinc-900 border ${error && !title ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-700 focus:border-emerald-500'} rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-transparent outline-none transition-all placeholder:text-zinc-700`}
                    placeholder="e.g. Consolidated Printer Issue..."
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if(error) setError(null); // Clear error on type
                    }}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Summary / Merge Reason</label>
                <textarea 
                    className={`w-full bg-zinc-900 border ${error && !description ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-700 focus:border-emerald-500'} rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-transparent outline-none transition-all resize-none h-24 placeholder:text-zinc-700`}
                    placeholder="Describe why these tickets are being merged..."
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        if(error) setError(null);
                    }}
                />
            </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority Level</label>
                <div className="relative">
                    <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                    </select>
                    <div className="absolute right-4 top-3.5 pointer-events-none text-zinc-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
            >
                {isSubmitting ? (
                     <>
                        <span className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></span>
                        Processing...
                     </>
                ) : 'Confirm Merge'}
            </button>
        </div>

      </div>
    </div>
  );
}
