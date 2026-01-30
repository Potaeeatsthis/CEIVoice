// src/components/DraftEditorForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DraftEditorForm({ draft, staff }: { draft: any; staff: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Initialize form with the data passed from the server
  const [formData, setFormData] = useState({
    title: draft.title || '',
    description: draft.description || '',
    category: draft.category || 'General',
    priority: draft.priority || 'MEDIUM',
    assigned_to: draft.assigned_to || '',
    deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send the finalized data to the promote API
      const res = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          ...formData
        }),
      });

      if (!res.ok) throw new Error('Failed to activate ticket');
      
      router.push('/admin/tickets');
      router.refresh();
    } catch (error) {
      alert('Error activating ticket');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-950/40 p-6 rounded-lg border border-zinc-800">
      {/* --- FORM FIELDS --- */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none focus:border-blue-500"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
          <textarea
            rows={5}
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none focus:border-blue-500"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Priority</label>
          <select
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Assignee</label>
          <select
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none"
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          >
            <option value="">-- Unassigned --</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-zinc-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded shadow-lg shadow-green-900/20 disabled:opacity-50"
        >
          {loading ? 'Activating...' : 'Approve & Activate'}
        </button>
      </div>
    </form>
  );
}
