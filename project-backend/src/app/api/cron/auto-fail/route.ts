import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sendTicketNotification } from "@/lib/email"

export async function GET() {
  const now = new Date().toISOString()

  // 1️⃣ Get tickets that should fail
  const { data: ticketsToFail, error: fetchError } = await supabase
    .from("tickets")
    .select(`
      *,
      created_by_user:created_by(*),
      assigned_to_user:assigned_to(*)
    `)
    .lt("deadline", now)
    .neq("status", "FAILED")

  if (fetchError) {
    console.error(fetchError)
    return NextResponse.json({ error: fetchError }, { status: 500 })
  }

  if (!ticketsToFail || ticketsToFail.length === 0) {
    return NextResponse.json({ success: true, updated: 0 })
  }

  // 2️⃣ Update them
  const { error: updateError } = await supabase
    .from("tickets")
    .update({ status: "FAILED" })
    .lt("deadline", now)
    .neq("status", "FAILED")

  if (updateError) {
    console.error(updateError)
    return NextResponse.json({ error: updateError }, { status: 500 })
  }

  // 3️⃣ Send email for each ticket
  for (const ticket of ticketsToFail) {
    await sendTicketNotification("FAILED", ticket, "System")
  }

  return NextResponse.json({
    success: true,
    updated: ticketsToFail.length
  })
}
