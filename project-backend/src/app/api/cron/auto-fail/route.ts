import { supabaseAdmin } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sendTicketNotification } from "@/lib/email"

export async function GET() {
  const now = new Date().toISOString()

  // 1️⃣ Get tickets that should fail
  const { data: ticketsToFail, error: fetchError } = await supabaseAdmin
    .from("tickets")
    .select(`
      *,
      created_by_user:users!tickets_created_by_fkey(*),
      assigned_to_user:users!tickets_assigned_to_fkey(*)
    `)
    .lt("deadline", now)
    .in("status", ["NEW", "IN PROGRESS"])

  if (fetchError) {
    console.error(fetchError)
    return NextResponse.json({ error: fetchError }, { status: 500 })
  }

  if (!ticketsToFail || ticketsToFail.length === 0) {
    return NextResponse.json({ success: true, updated: 0 })
  }

  const ids = ticketsToFail.map(t => t.id)

  // 2️⃣ Update them
  const { error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({ status: "FAILED", failed_at: now })
    .in("id", ids)

  if (updateError) {
    console.error(updateError)
    return NextResponse.json({ error: updateError }, { status: 500 })
  }

  // 3️⃣ Insert system comments
  const systemComments = ticketsToFail.map(ticket => ({
    ticket_id: ticket.id,
    type: 'system',
    is_internal: false,
    created_at: now,
  }))

  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .insert(systemComments)

  if (commentError) {
    console.error('Insert system comment error:', commentError)
  }

  // 4️⃣ Send email for each ticket
  const emailResults = await Promise.allSettled(
    ticketsToFail.map(ticket =>
      sendTicketNotification("FAILED", ticket, "System")
    )
  )

  emailResults.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Failed to send email for ticket #${ticketsToFail[i].id}:`, result.reason)
    }
  })

  return NextResponse.json({
    success: true,
    updated: ticketsToFail.length
  })
}
