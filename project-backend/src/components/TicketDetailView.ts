// --- HANDLER: Post Comment ---
  async function handlePostComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      // ✅ CALL THE API (This was missing!)
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment })
      });

      if (!res.ok) throw new Error("Failed to post comment");
      
      setNewComment("");
      router.refresh(); // Reloads the page to show the new message
    } catch (e) {
      console.error(e);
      alert("Failed to send message. Check console for details.");
    } finally {
      setLoading(false);
    }
  }
