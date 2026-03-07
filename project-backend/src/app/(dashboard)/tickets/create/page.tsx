// src/app/(dashboard)/tickets/create/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';

const MAX_DESCRIPTION = 2000;

export default function CreateTicketPage() {
  const router       = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef  = useRef<HTMLDivElement>(null);

  const [title,           setTitle]           = useState('');
  const [message,         setMessage]         = useState('');
  const [contactEmail,    setContactEmail]    = useState('');
  const [accountEmail,    setAccountEmail]    = useState('');
  const [useAccountEmail, setUseAccountEmail] = useState(false);
  const [files,           setFiles]           = useState<File[]>([]);
  const [isDragging,      setIsDragging]      = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [step,            setStep]            = useState<'idle' | 'uploading' | 'submitting'>('idle');

  // Pre-fill email from custom JWT session
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!res.ok) return;
        const user = await res.json(); // GET /me returns user directly
        if (user?.email) {
          setAccountEmail(user.email);
          setContactEmail(user.email);
          setUseAccountEmail(true);
        }
      } catch {}
    })();
  }, []);

  // Sync contactEmail when checkbox toggles
  const handleUseAccountEmail = (checked: boolean) => {
    setUseAccountEmail(checked);
    if (checked) setContactEmail(accountEmail);
    else         setContactEmail('');
  };

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

  const charCount   = message.length;
  const charWarning = charCount > MAX_DESCRIPTION * 0.85;
  const charOver    = charCount > MAX_DESCRIPTION;
  const canSubmit   = title.trim() && message.trim() && contactEmail.trim() && !charOver && !isSubmitting;

  const stepLabel = step === 'uploading'  ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`
                  : step === 'submitting' ? 'Submitting ticket…'
                  : 'Submit Ticket';

  return (
    <div className="h-full flex flex-col gap-0">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/tickets"
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-zinc-500 text-sm">Back to tickets</span>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 flex-1 min-h-0">

        {/* ── Left: Form ── */}
        <div className="flex-1 min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden shadow-2xl shadow-black/60 flex flex-col">
          {/* Form header */}
          <div className="px-8 pt-7 pb-5 border-b border-zinc-800/60 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white tracking-tight">New Support Request</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Fill in the details below and our team will get back to you.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600/60 focus:border-blue-600/60 transition-all"
              />
            </div>

            {/* Contact email */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                {/* Checkbox: use account email */}
                {accountEmail && (
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={useAccountEmail}
                        onChange={(e) => handleUseAccountEmail(e.target.checked)}
                      />
                      <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900 peer-checked:bg-white-600 peer-checked:border-white-600 transition-all flex items-center justify-center">
                        {useAccountEmail && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                      Use my account email
                    </span>
                  </label>
                )}
              </div>

              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={useAccountEmail}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600/60 focus:border-blue-600/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:select-none"
                />
                {useAccountEmail && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white-500 bg-white-950/60 border border-white-800/50 px-2 py-0.5 rounded-full">
                    account
                  </span>
                )}
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
                  {charCount} / {MAX_DESCRIPTION}
                </span>
              </div>
              <textarea
                rows={9}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail. Include steps to reproduce, expected vs actual behaviour, and any relevant context."
                maxLength={MAX_DESCRIPTION}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600/60 focus:border-blue-600/60 transition-all resize-none leading-relaxed"
              />
              {/* Progress bar */}
              <div className="h-0.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    charOver    ? 'bg-red-500' :
                    charWarning ? 'bg-amber-500' :
                                  'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min((charCount / MAX_DESCRIPTION) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Attachments <span className="text-zinc-700 font-normal normal-case">— optional</span>
              </label>

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

              <div
                ref={dropzoneRef}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 cursor-pointer transition-all duration-200
                  ${isDragging
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
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

            {/* Submit row */}
            <div className="flex items-center justify-between gap-4 pt-1 pb-2">
              <p className="text-xs text-zinc-600 leading-relaxed">
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-shrink-0 flex items-center gap-2.5 px-7 py-2.5 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm"
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

        {/* ── Right: Info panel ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">

          {/* What to expect */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
            <div className="p-5">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">What to expect</p>
              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: 'Confirmation email',
                    desc: "You'll receive a confirmation as soon as your ticket is created.",
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                    title: 'Agent assignment',
                    desc: 'A support agent will be assigned and reach out if more info is needed.',
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ),
                    title: 'Email updates',
                    desc: "You'll be notified at every status change until resolved.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                      <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
            <div className="p-5">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Tips for faster help</p>
              <div className="space-y-3">
                {[
                  {
                    icon: (<svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                    text: 'Be specific about what went wrong and when it started.',
                  },
                  {
                    icon: (<svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h8" /></svg>),
                    text: 'List the exact steps needed to reproduce the issue.',
                  },
                  {
                    icon: (<svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>),
                    text: 'Attach screenshots or logs to speed up diagnosis.',
                  },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">{tip.icon}</div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{tip.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority note */}
          <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-5">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-500/80 leading-relaxed">
                For urgent issues affecting your workflow, mention <span className="font-semibold text-amber-400">URGENT</span> at the start of your subject.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
