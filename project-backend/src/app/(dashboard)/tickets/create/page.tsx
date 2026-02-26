// src/app/(dashboard)/tickets/create/page.tsx

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function CreateTicketPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (user?.email && !email) setEmail(user.email);
    };
    getUser();
  }, [email]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachment = async (fileToUpload: File) => {
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `ticket-uploads/${fileName}`;

    const { error: uploadError } = await supabaseBrowser
      .storage
      .from('ticket-attachments')
      .upload(filePath, fileToUpload);

    if (uploadError) throw uploadError;

    const { data } = supabaseBrowser
      .storage
      .from('ticket-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim() || !email.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        setStatusMsg({ type: 'success', text: `Uploading ${files.length} attachment(s)...` });
        uploadedUrls = await Promise.all(files.map(file => uploadAttachment(file)));
      }

      setStatusMsg({ type: 'success', text: "Submitting ticket..." });
      
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          message,
          contactEmail: email,
          img: uploadedUrls
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      router.push('/user/tickets');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || "Network or Upload error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-xl">

        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/user/tickets"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
          >
            ←
          </Link>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Create Ticket
          </h1>
        </div>

        {statusMsg && (
          <div className={`mb-6 p-4 rounded-lg text-sm border ${
            statusMsg.type === 'error' 
              ? 'bg-red-950/20 border-red-900/50 text-red-400' 
              : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
          }`}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 font-medium">
              Subject *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-zinc-500/30 outline-none"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 font-medium">
              Contact Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-zinc-500/30 outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 font-medium">
              Description *
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-zinc-500/30 outline-none resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 font-medium">Attachments</label>
            
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700 text-sm text-zinc-300">
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(i)} 
                      className="text-zinc-500 hover:text-red-400 ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="border border-dashed border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer transition-all group"
            >
              <span className="text-zinc-500 text-xs group-hover:text-zinc-400">
                Click to add files (PDF, JPG, PNG)
              </span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png"
                multiple 
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              'Submit Ticket'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
