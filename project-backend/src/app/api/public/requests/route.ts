// src/app/api/public/requests/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// import { publishToQueue } from '@/lib/rabbitmq'; // Uncomment if you are ready to connect RabbitMQ

export async function POST(request: Request) {
  // --- NO ROLE RESTRICTION (Public Endpoint) ---

  try {
    const body = await request.json();
    const { email, message } = body;

    // Validate Input [cite: 30]
    if (!email || !message) {
      return NextResponse.json({ error: 'Email and Message are required' }, { status: 400 });
    }

    // Create the Ticket with 'Draft' status
    // Requirement: Store original email and message [cite: 32]
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          user_email: email,
          description: message, // The raw message for AI to analyze
          status: 'DRAFT',      // Initial status before Admin review
          origin: 'public_form'
        }
      ])
      .select('id, created_at')
      .single();

    if (error) throw error;

    // TODO: Trigger AI Processing
    // Requirement: AI processing begins immediately [cite: 32]
    // await publishToQueue('ai_processing', { ticketId: data.id, text: message });

    // Return the Tracking ID so the user can track status later [cite: 30]
    return NextResponse.json({ 
      message: 'Request received', 
      trackingId: data.id 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
