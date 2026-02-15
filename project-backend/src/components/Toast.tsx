// src/components/Toast.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Toast() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<{ message: string; ticketId: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleToast = (e: any) => {
      setData(e.detail);
      setIsVisible(true);

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (!isVisible || !data) return null;

  // Your original styles
  const styles = data.type === 'success' 
    ? "border-emerald-500/20 bg-zinc-900/90 text-zinc-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
    : "border-red-500/20 bg-zinc-900/90 text-zinc-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]";

  const iconColor = data.type === 'success' ? "text-emerald-500" : "text-red-500";

  return (
    <div 
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-4 pl-4 pr-6 py-4 
        rounded-xl border backdrop-blur-md shadow-2xl cursor-pointer
        transition-all duration-300 ease-out transform
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
        ${styles}
      `}
      onClick={() => {
        if (data.ticketId) router.push(`/user/tickets/${data.ticketId}`);
        setIsVisible(false);
      }}
    >
      <div className={`p-1.5 rounded-full bg-zinc-950/50 border border-white/5 ${iconColor}`}>
        {data.type === 'success' ? (
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
        ) : (
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        )}
      </div>
      
      <div className="flex flex-col">
        <span className="text-sm font-semibold">New Message</span>
        <span className="text-xs text-zinc-400 truncate max-w-[200px]">{data.message}</span>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
        }} 
        className="ml-2 text-zinc-500 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
