// src/app/(dashboard)/tickets/create/page.tsx

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function NewRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  // ✨ CHANGED: Now stores an array of files
  const [files, setFiles] = useState<File[]>([]); 

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (user?.email && !email) setEmail(user.email);
    };
    getUser();
  }, [email]);

  // ✨ CHANGED: Handle multiple file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Append new files to existing ones (or replace, depending on preference. Here we accumulate)
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to upload a single file
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const formData = new FormData(e.currentTarget);
    const messageText = formData.get('message') as string;
    const currentEmail = (formData.get('email') as string) || email;

    if (!currentEmail || !messageText) {
      setStatusMsg({ type: 'error', text: "Please provide both an email and details." });
      setLoading(false);
      return;
    }

    try {
      // ✨ CHANGED: Upload ALL files in parallel
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        setStatusMsg({ type: 'success', text: `Uploading ${files.length} attachment(s)...` });
        // Run all uploads at once
        uploadedUrls = await Promise.all(files.map(file => uploadAttachment(file)));
      }

      const autoSubject = messageText.slice(0, 45) + (messageText.length > 45 ? "..." : "");
      const payload = {
        email: currentEmail.trim(), 
        subject: autoSubject,       
        message: messageText,
        img: uploadedUrls // Send array of URLs
      };

      setStatusMsg({ type: 'success', text: "Submitting ticket..." });
      const response = await fetch('/api/public/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        router.refresh(); 
        router.push(`/user/tickets/${result.trackingId}?status=submitted`);
      } else {
        setStatusMsg({ type: 'error', text: result.error || "Submission failed." });
      }
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: 'error', text: "Network or Upload error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">New Request</h1>
          <p className="text-zinc-500 mt-2 text-sm">Submit your issue and we'll get back to you shortly.</p>
        </header>

        {statusMsg && (
          <div className={`mb-6 p-4 rounded-lg text-sm border ${
            statusMsg.type === 'error' 
              ? 'bg-red-950/20 border-red-900/50 text-red-400' 
              : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
          }`}>
            {statusMsg.text}
          </div>
        )}

        <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Issue Details (Required)</label>
              <textarea 
                name="message" 
                required 
                placeholder="Describe your issue in detail..." 
                rows={8} 
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-blue-500 outline-none resize-none placeholder:text-zinc-700" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Attachments</label>
              
              {/* ✨ Display Selected Files List */}
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
                {/* ✨ Added 'multiple' attribute */}
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
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-900/20"
            >
              {loading ? "PROCESSING..." : "SUBMIT REQUEST"}
            </button>
          </form>
        </div>
      </div>
    </div>
  ); 
}
