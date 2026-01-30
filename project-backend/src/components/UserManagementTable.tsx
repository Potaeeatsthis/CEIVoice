// src/components/UserManagementTable.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  email: string;
  full_name: string;
  role: 'USER' | 'ASSIGNEE' | 'ADMIN';
  special_tags: string[] | null;
};

export default function UserManagementTable({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // -- Modal State --
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // 1. Handle Role Change (Same as before)
  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update');
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      router.refresh();
    } catch (error) {
      alert('Error updating role');
    } finally {
      setLoadingId(null);
    }
  };

  // 2. Open Modal instead of Prompt
  const openScopeModal = (user: User) => {
    setEditingUser(user);
    setTagInput(user.special_tags?.join(', ') || '');
  };

  // 3. Save Tags (Triggered from Modal)
  const saveTags = async () => {
    if (!editingUser) return;

    const newTags = tagInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setLoadingId(editingUser.id);
    
    // Close modal immediately for better UX
    const userToUpdate = editingUser;
    setEditingUser(null); 

    try {
      const res = await fetch(`/api/admin/users/${userToUpdate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ special_tags: newTags }),
      });

      if (!res.ok) throw new Error('Failed to update tags');

      setUsers(users.map(u => u.id === userToUpdate.id ? { ...u, special_tags: newTags } : u));
      router.refresh();
    } catch (error) {
      alert('Error updating tags');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name or email..."
        className="w-full max-w-sm px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Main Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              <th className="px-6 py-3 font-medium">User Details</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Scope (AI Routing)</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="group hover:bg-zinc-900/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-white font-medium">{user.full_name}</div>
                  <div className="text-zinc-500 text-xs font-mono mt-0.5">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={user.role}
                    disabled={loadingId === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={`bg-transparent border border-zinc-800 rounded px-2 py-1 text-xs font-medium cursor-pointer focus:ring-2 focus:ring-blue-500/50 outline-none transition-all
                      ${user.role === 'ADMIN' ? 'text-red-400 border-red-900/30 bg-red-950/10' : 
                        user.role === 'ASSIGNEE' ? 'text-amber-400 border-amber-900/30 bg-amber-950/10' : 
                        'text-zinc-400'}`}
                  >
                    <option value="USER" className="bg-zinc-900 text-zinc-400">User</option>
                    <option value="ASSIGNEE" className="bg-zinc-900 text-amber-400">Assignee</option>
                    <option value="ADMIN" className="bg-zinc-900 text-red-400">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {user.special_tags && user.special_tags.length > 0 ? (
                      user.special_tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/40 text-blue-300 border border-blue-900/50">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-xs italic">--</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openScopeModal(user)}
                    disabled={loadingId === user.id}
                    className="text-zinc-500 hover:text-white text-xs underline decoration-zinc-700 hover:decoration-white underline-offset-2 transition-all"
                  >
                    Edit Scope
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Custom Dark Theme Modal --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-white mb-2">Edit User Scope</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Define routing tags for <span className="text-zinc-200">{editingUser.full_name}</span>. 
              Separate multiple tags with commas.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tags</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. IT, Network, HR"
                  className="w-full mt-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-zinc-600"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveTags()}
                />
                <p className="text-xs text-zinc-600 mt-2">
                  Used by AI to auto-assign relevant tickets.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTags}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors shadow-lg shadow-blue-900/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
