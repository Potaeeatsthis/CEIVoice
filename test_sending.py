import os
import json
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# --- NEW IMPORTS (Based on your provided docs) ---
from kubemq.events.lowlevel.event import Event
from kubemq.events.lowlevel.sender import Sender

load_dotenv("main.env")

# 1. Setup Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") # Ensure this is SERVICE_ROLE_KEY for writing
KUBEMQ_ADDRESS = os.getenv("KUBEMQ_ADDRESS", "localhost:50000")

# 2. Connect to Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_test():
    print("🧪 STARTING BACKEND TEST (Low-Level Sender)...")

    # --- A. Simulate User creating a Ticket in Supabase ---
    print("1. Creating dummy ticket in Supabase...")
    test_description = "I cannot pay my bill because the credit card page gives a 404 error."
    
    # Insert ticket
    data = supabase.table("tickets").insert({
        "description": test_description,
        "status": "NEW"
    }).execute()

    if not data.data:
        print("❌ Failed to create ticket in DB. Check Supabase credentials.")
        return

    new_ticket = data.data[0]
    ticket_id = new_ticket['id']
    print(f"✅ Ticket Created! ID: {ticket_id}")

    # --- B. Send Event to KubeMQ (Using Low-Level Sender) ---
    print(f"2. Sending Job to KubeMQ for Ticket #{ticket_id}...")
    
    try:
        # Initialize the Sender with your address
        publisher = Sender(KUBEMQ_ADDRESS)
        
        # Construct the Event object
        event = Event(
            metadata="New Ticket Test",
            # We must encode the JSON string to bytes (UTF-8)
            body=json.dumps({
                "ticket_id": ticket_id,
                "description": test_description
            }).encode('UTF-8'),
            store=False,
            channel="ticket_processing_queue",
            client_id="test-script-producer"
        )
        
        # Send the event
        res = publisher.send_event(event)
        print(f"✅ Message sent! KubeMQ Response: {res}")
        
    except Exception as err:
        print(f"❌ KubeMQ Error: {err}")
        return

    # --- C. Wait & Verify ---
    print("3. Waiting 5 seconds for AI Worker to process...")
    time.sleep(5)

    # Fetch the ticket again to see if it was updated
    updated_data = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
    
    if updated_data.data:
        updated_ticket = updated_data.data[0]
        print("\n--- TEST RESULTS ---")
        print(f"Original Status: NEW")
        print(f"Current Status:  {updated_ticket['status']}")
        print(f"AI Category:     {updated_ticket['category']}")
        
        if updated_ticket['status'] == 'DRAFT':
            print("\n🎉 SUCCESS: The backend processed the ticket!")
        else:
            print("\n⚠️ WAITING: Status is still NEW (Worker might be slow or disconnected).")
    else:
        print("❌ Error: Could not fetch updated ticket.")

if __name__ == "__main__":
    run_test()
