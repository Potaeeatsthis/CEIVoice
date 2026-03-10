import { NextResponse } from "next/server";
import { sendDeadlineReminder } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase"

console.log("Running deadline reminder job...");

export async function GET() {

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .lte('deadline', tomorrow.toISOString())
    .eq('status', 'NEW');

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ message: "No reminders needed" });
  }

  for (const ticket of tickets) {
    console.log("Sending reminder for ticket:", ticket.id);

    await sendDeadlineReminder(ticket);
  }

  return NextResponse.json({ success: true });
}
