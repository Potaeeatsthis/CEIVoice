import { NextResponse } from "next/server";
import { sendDeadlineReminder } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  console.log("Running deadline reminder job...");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      assigned_to_user:users!tickets_assigned_to_fkey(id, email, full_name, role)
    `)
    .lte('deadline', tomorrow.toISOString())
    .in('status', ['NEW', 'IN PROGRESS']);

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ message: "No reminders needed" });
  }

  const results = await Promise.allSettled(
    tickets.map(ticket => {
      console.log("Sending reminder for ticket:", ticket.id);
      return sendDeadlineReminder(ticket);
    })
  );

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Failed to send reminder for ticket #${tickets[i].id}:`, result.reason);
    }
  });

  return NextResponse.json({ success: true, reminded: tickets.length });
}
