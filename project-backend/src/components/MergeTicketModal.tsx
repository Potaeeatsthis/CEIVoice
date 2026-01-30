// src/components/MergeTicketModal.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MergeTicketModal({ parentTicketId }: { parentTicketId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'INPUT' | 'CONFIRM'>('INPUT');
  const [childId, setChildId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setStep('INPUT');
    setChildId('');
  };

  const handleNextStep = () => {
    if (!childId) return;
    // Prevent merging into self
    if (childId === parentTicketId.toString()) {
      alert("Cannot merge a ticket into itself.");
      return;
    }
    setStep('CONFIRM');
  };

  const executeMerge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentTicketId: parentTicketId,
          childTicketIds: [childId] // Send as array
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Merge failed');
      }

      // Success
      handleClose();
      router.refresh(); 
      // Optional: You could show a specialized "Toast" or success state here instead of alert
      // alert('Tickets merged successfully'); 
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-purple-400 border border-purple-900/50 bg-purple-950/20 rounded hover:bg-purple-900/40 transition-colors flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5"/><path d="M4 8a10 10 0 0 1 10-5"/><path d="m8 21 4-8 5 5"/><path d="M4 16a10 10 0 0 0 10 5"/></svg>
        Merge Ticket
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-6 relative overflow-hidden">
            
            {/* STEP 1: INPUT ID */}
            {step === 'INPUT' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Merge Ticket</h3>
                  <p className="text-sm text-zinc-400">
                    Enter the ID of the duplicate ticket to merge into this one.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Duplicate Ticket ID</label>
                  <input
                    type="text"
                    value={childId}
                    onChange={(e) => setChildId(e.target.value.replace(/\D/g, ''))} // Numbers only
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-zinc-600 transition-all"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={!childId}
                    className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded shadow-lg shadow-purple-900/20 disabled:opacity-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONFIRMATION (Replaces the native popup) */}
            {step === 'CONFIRM' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-950/30 border border-red-900/50 rounded-full text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Confirm Merge</h3>
                    <p className="text-sm text-zinc-400">
                      Are you sure you want to merge <span className="text-white font-mono">Ticket #{childId}</span> into this ticket?
                    </p>
                    <p className="text-xs text-red-400 mt-2 bg-red-950/20 border border-red-900/30 px-2 py-1 rounded">
                      Warning: Ticket #{childId} will be permanently closed.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setStep('INPUT')}
                    className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    onClick={executeMerge}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded shadow-lg shadow-purple-900/20 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {loading && <span className="animate-spin text-white/50">⟳</span>}
                    {loading ? 'Merging...' : 'Confirm Merge'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
