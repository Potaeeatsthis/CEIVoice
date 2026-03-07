// src/app/(dashboard)/tickets/create/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';

const MAX_DESCRIPTION = 2000;

export default function CreateTicketPage() {
  const router      = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef  = useRef<HTMLDivElement>(null);

  const [title,        setTitle]        = useState('');
  const [message,      setMessage]      = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [files,        setFiles]        = useState<File[]>([]);
  const [isDragging,   setIsDragging]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step,         setStep]         = useState<'idle' | 'uploading' | 'submitting'>('idle');

  // Pre-fill email
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (user?.email) setContactEmail(user.email);
    })();
  }, []);

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = ()                    => setIsDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      ['image/jpeg','image/png','image/gif','image/webp','application/pdf'].includes(f.type)
    );
    setFiles(prev => [...prev, ...dropped]);
  };

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, j) => j !== i));

  // ── Upload ─────────────────────────────────────────────────────────────────
  const uploadFile = async (file: File): Promise<string> => {
    const ext      = file.name.split('.').pop();
    const name     = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `ticket-uploads/${name}`;

    const { error } = await supabaseBrowser.storage
      .from('ticket-attachments')
      .upload(filePath, file);

    if (error) throw error;

    return supabaseBrowser.storage
      .from('ticket-attachments')
      .getPublicUrl(filePath).data.publicUrl;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim())        { toast.error('Subject is required');       return; }
    if (!message.trim())      { toast.error('Description is required');   return; }
    if (!contactEmail.trim()) { toast.error('Contact email is required'); return; }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
    if (!emailOk) { toast.error('Please enter a valid email address'); return; }

    setIsSubmitting(true);

    try {
      let uploadedUrls: string[] = [];

      if (files.length > 0) {
        setStep('uploading');
        uploadedUrls = await Promise.all(files.map(uploadFile));
      }

      setStep('submitting');

      const res = await fetch('/api/tickets', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, message, contactEmail, img: uploadedUrls }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');

      toast.success('Ticket submitted successfully');
      router.push('/tickets');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
      setStep('idle');
    }
  };

  const charCount    = message.length;
  const charWarning  = charCount > MAX_DESCRIPTION * 0.85;
  const charOver     = charCount > MAX_DESCRIPTION;
  const canSubmit    = title.trim() && message.trim() && contactEmail.trim() && !charOver && !isSubmitting;

  const stepLabel = step === 'uploading'  ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`
                  : step === 'submitting' ? 'Submitting ticket…'
                  : 'Submit Ticket';

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link
          href="/tickets"
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">New Support Request</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Describe your issue and our team will get back to you.</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden shadow-xl shadow-black/40">

        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-blue-600 via-blue-500 to-transparent" />

        <form onSubmit={handleSubmit} className="p-7 space-y-6">

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue"
              maxLength={120}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all"
            />
          </div>

          {/* Contact email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Description <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs tabular-nums transition-colors ${
                charOver    ? 'text-red-400 font-semibold' :
                charWarning ? 'text-amber-400' :
                              'text-zinc-600'
              }`}>
                {charCount}/{MAX_DESCRIPTION}
              </span>
            </div>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail. Include steps to reproduce, expected vs actual behaviour, and any relevant context."
              maxLength={MAX_DESCRIPTION}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Attachments <span className="text-zinc-700 font-normal normal-case">— optional</span>
            </label>

            {/* File chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {files.map((f, i) => {
                  const isImg = f.type.startsWith('image/');
                  return (
                    <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
                      <span className={`text-xs ${isImg ? 'text-blue-400' : 'text-zinc-400'}`}>
                        {isImg ? '🖼' : '📄'}
                      </span>
                      <span className="text-xs text-zinc-300 truncate max-w-[140px]">{f.name}</span>
                      <span className="text-[10px] text-zinc-600">{(f.size / 1024).toFixed(0)}KB</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-zinc-600 hover:text-red-400 transition-colors ml-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drop zone */}
            <div
              ref={dropzoneRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all duration-200
                ${isDragging
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-900/40' : 'bg-zinc-800'}`}>
                <svg className={`w-4 h-4 transition-colors ${isDragging ? 'text-blue-400' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-blue-300' : 'text-zinc-400'}`}>
                  {isDragging ? 'Drop files here' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">PDF, JPG, PNG, WebP — max 10MB each</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
                onChange={addFiles}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-800" />

          {/* Submit */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-xs text-zinc-600">
              Ticket will be reviewed by our support team. You'll receive email updates.
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-shrink-0 flex items-center gap-2.5 px-6 py-2.5 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" />
                  <span>{stepLabel}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tips for a faster resolution</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { text: 'Be specific about what went wrong and when it started.' },
            { text: 'List the steps to reproduce the issue if possible.' },
            { text: 'Attach screenshots or error logs to help diagnose.' },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">{tip.icon}</span>
              <p className="text-xs text-zinc-600 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
