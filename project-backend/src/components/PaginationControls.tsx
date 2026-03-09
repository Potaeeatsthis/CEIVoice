// src/components/PaginationControls.tsx

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationControlsProps {
  totalCount: number;
  pageSize: number;
}

export default function PaginationControls({ totalCount, pageSize }: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-zinc-800/60 px-5 py-3.5">
      <div className="flex flex-1 items-center justify-between">
        <p className="text-[13px] text-zinc-500">
          Showing <span className="font-medium text-zinc-300">{Math.min(((currentPage - 1) * pageSize) + 1, totalCount)}</span> to{' '}
          <span className="font-medium text-zinc-300">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
          <span className="font-medium text-zinc-300">{totalCount}</span> results
        </p>
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
          >
            <span className="sr-only">Previous</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
          >
            <span className="sr-only">Next</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}
