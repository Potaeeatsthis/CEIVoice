// src/components/TicketToolbar.tsx

'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export default function TicketToolbar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // ✨ RESET TO PAGE 1 ON FILTER CHANGE
    params.set('page', '1'); 
    
    replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, replace]);

  return (
     // ... (The rest of the UI remains exactly the same as before)
     <div className="flex flex-col md:flex-row gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      
      {/* Search Input */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search by ID or Title..."
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg pl-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600"
          defaultValue={searchParams.get('q')?.toString()}
          onChange={(e) => {
            const val = e.target.value;
            setTimeout(() => handleSearch('q', val), 300); 
          }}
        />
      </div>

      {/* Filters Group */}
      <div className="flex gap-2">
        <select
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 outline-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
          onChange={(e) => handleSearch('status', e.target.value)}
          defaultValue={searchParams.get('status')?.toString() || ""}
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="SOLVED">Solved</option>
          <option value="MERGED">Merged</option>
        </select>

        <select
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 outline-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
          onChange={(e) => handleSearch('priority', e.target.value)}
          defaultValue={searchParams.get('priority')?.toString() || ""}
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {(searchParams.get('q') || searchParams.get('status') || searchParams.get('priority')) && (
           <button
             onClick={() => replace(pathname)}
             className="px-3 py-2.5 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/50 rounded-lg transition-all"
           >
             Clear
           </button>
        )}
      </div>
    </div>
  );
}
