// src/components/TicketDetailView.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TicketDetailView({ ticket, comments, currentUser, allUsers }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  
  // Local state for dropdowns (initially set to current ticket values)
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignee, setAssignee] = useState(ticket.assigned_to || "");

  const isAdminOrAssignee = currentUser.role === 'ADMIN' || currentUser.role === 'ASSIGNEE';

  // --- HANDLER: Update Ticket (Status/Assignee) ---
  async function handleUpdate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          priority, 
          assigned_to: assignee === "unassigned" ? null : assignee 
        })
      });

      if (!res.ok) throw new Error("Failed to update");
      router.refresh(); // Reloads the page to show new data
      alert("Ticket updated successfully");
    } catch (e) {
      alert("Error updating ticket");
    } finally {
      setLoading(false);
    }
  }

  // --- HANDLER: Post Comment ---
  async function handlePostComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      // NOTE: You need to create this endpoint (api/tickets/[id]/comments/route.ts)
      // For now, this is how the UI *would* call it.
      /*
      await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message: newComment })
      });
      */
      alert("Comment logic ready! (Backend endpoint needed)");
      setNewComment("");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* --- LEFT COLUMN: Main Content --- */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket Description */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-400 text-sm font-medium uppercase mb-2">Description</h3>
          <p className="text-zinc-200 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* AI Analysis (If exists) */}
        {ticket.ai_solution && (
          <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-bold uppercase mb-2 flex items-center gap-2">
              ✨ AI Suggested Solution
            </h3>
            <p className="text-blue-200/80 text-sm">{ticket.ai_solution}</p>
          </div>
        )}

        {/* Conversation / Comments */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-white text-lg font-bold mb-6">Discussion</h3>
          
          <div className="space-y-6 mb-8">
            {comments.length === 0 ? (
              <p className="text-zinc-500 italic text-sm">No comments yet.</p>
            ) : (
              comments.map((c: any) => (
                <div key={c.id} className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 border border-zinc-700">
                    {c.user?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-zinc-300">{c.user?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-zinc-600">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">{c.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="flex gap-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1 bg-black border border-zinc-800 rounded-md p-3 text-sm text-white focus:outline-none focus:border-blue-600"
              rows={3}
            />
            <button 
              onClick={handlePostComment}
              disabled={loading}
              className="bg-white text-black font-medium px-4 rounded-md hover:bg-zinc-200 disabled:opacity-50 h-fit py-2"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: Meta & Controls --- */}
      <div className="space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-6">
          <h3 className="text-white font-bold mb-4">Ticket Details</h3>

          {/* Status Control */}
          <div>
            <label className="text-xs text-zinc-500 font-medium uppercase block mb-2">Status</label>
            {isAdminOrAssignee ? (
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-black border border-zinc-700 text-white text-sm rounded-md p-2.5 focus:border-blue-500 outline-none"
              >
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SOLVED">Solved</option>
                <option value="MERGED">Merged</option>
              </select>
            ) : (
              <span className="inline-block px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">
                {ticket.status}
              </span>
            )}
          </div>

          {/* Priority Control */}
          <div>
            <label className="text-xs text-zinc-500 font-medium uppercase block mb-2">Priority</label>
            {isAdminOrAssignee ? (
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-black border border-zinc-700 text-white text-sm rounded-md p-2.5 focus:border-blue-500 outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            ) : (
              <span className={`text-sm font-bold ${ticket.priority === 'HIGH' ? 'text-red-500' : 'text-zinc-400'}`}>
                {ticket.priority}
              </span>
            )}
          </div>

          {/* Assignee Control */}
          <div>
            <label className="text-xs text-zinc-500 font-medium uppercase block mb-2">Assignee</label>
            {isAdminOrAssignee ? (
              <select 
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-black border border-zinc-700 text-white text-sm rounded-md p-2.5 focus:border-blue-500 outline-none"
              >
                <option value="unassigned">Unassigned</option>
                {allUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-zinc-800 text-xs flex items-center justify-center text-zinc-500">
                  {ticket.assigned_to_user?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm text-zinc-300">
                  {ticket.assigned_to_user?.full_name || 'Unassigned'}
                </span>
              </div>
            )}
          </div>

          {/* Save Button (Only if changes made) */}
          {isAdminOrAssignee && (
            <button 
              onClick={handleUpdate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Ticket'}
            </button>
          )}

          <div className="border-t border-zinc-800 pt-4 mt-4">
            <div className="text-xs text-zinc-500">
              <span className="block">Created by: {ticket.created_by_user?.full_name || ticket.user_email}</span>
              <span className="block mt-1">Date: {new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
