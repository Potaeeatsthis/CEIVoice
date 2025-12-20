import os
import json
import torch
from dotenv import load_dotenv
from fastapi import FastAPI
from supabase import create_client, Client

from kubemq.events.subscriber import Subscriber
from kubemq.subscription.subscribe_type import SubscribeType
from kubemq.subscription.events_store_type import EventsStoreType
from kubemq.subscription.subscribe_request import SubscribeRequest

from transformers import BertTokenizer, BertForSequenceClassification
from sentence_transformers import SentenceTransformer

load_dotenv("main.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
KUBEMQ_ADDRESS = os.getenv("KUBEMQ_ADDRESS", "localhost:50000")

app = FastAPI()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ID Label Mapping
ID2LABEL = {0: "Technical", 1: "Billing", 2: "General"}

# Global reference to keep subscriber alive
kubemq_subscriber = None

print("Loading AI Models...")
tokenizer = BertTokenizer.from_pretrained("google-bert/bert-base-uncased")
classifier = BertForSequenceClassification.from_pretrained(
    "google-bert/bert-base-uncased",
    num_labels=len(ID2LABEL)
)
classifier.eval()
embedder = SentenceTransformer("all-MiniLM-L6-v2")
print("AI Models Loaded.")

def predict_category(text: str) -> str:
    """Predicts the category of the ticket description."""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = classifier(**inputs)
    return ID2LABEL[torch.argmax(outputs.logits, dim=1).item()]

def get_similar_solutions(text: str) -> str:
    """Finds similar past tickets using vector similarity search."""
    try:
        vector = embedder.encode(text).tolist()
        res = supabase.rpc(
            "match_tickets",
            {
                "query_embedding": vector,
                "match_threshold": 0.6,
                "match_count": 3
            }
        ).execute()

        if not res.data:
            return "No similar past issues found."

        return "\n".join(
            f"- (Ticket #{m['id']}) {m['ai_solution']}"
            for m in res.data
        )
    except Exception as e:
        print(f"Supabase RPC Error: {e}")
        return "Recommendation unavailable."

def run_pipeline(ticket_id: int, description: str) -> dict:
    """Runs the full AI pipeline on the ticket."""
    category = predict_category(description)
    embedding = embedder.encode(description).tolist()
    recommendations = get_similar_solutions(description)

    return {
        "title": f"[{category}] Auto-Generated Ticket",
        "summary": f"User reported a {category} issue: {description[:60]}...",
        "ai_solution": f"AI Suggested Steps:\n{recommendations}",
        "category": category,
        "embedding": embedding
    }

def handle_event(event):
    """
    Callback function for KubeMQ events.
    Matches SDK signature: (event)
    """
    try:
        if not event or not event.body:
            return

        # KubeMQ events body is bytes, needs decoding
        body_str = event.body.decode('utf-8')
        body = json.loads(body_str)

        ticket_id = body.get("ticket_id")
        description = body.get("description")

        if not ticket_id or not description:
            print("Skipping event: Invalid body format")
            return

        print(f"Processing ticket #{ticket_id}...")
        result = run_pipeline(ticket_id, description)

        supabase.table("tickets").update({
            **result,
            "status": "DRAFT",
            "updated_at": "now()"
        }).eq("id", ticket_id).execute()

        print(f"Successfully updated ticket #{ticket_id}")

    except Exception as e:
        print(f"Worker Error: {e}")

def on_error(msg):
    """Required error handler for KubeMQ"""
    print(f"KubeMQ Connection Error: {msg}")

@app.on_event("startup")
def start_worker():
    global kubemq_subscriber
    try:
        print(f"Connecting to KubeMQ at {KUBEMQ_ADDRESS}...")

        # Initialize Subscriber
        kubemq_subscriber = Subscriber(KUBEMQ_ADDRESS)

        # Configure Subscription
        subscribe_request = SubscribeRequest(
            channel="ticket_processing_queue",
            client_id="ai-worker-1",
            events_store_type=EventsStoreType.Undefined,
            group="ai_workers_group",
            subscribe_type=SubscribeType.Events
        )

        # Subscribe (Non-blocking)
        kubemq_subscriber.subscribe_to_events(subscribe_request, handle_event, on_error)
        print("Successfully subscribed to KubeMQ channel 'ticket_processing_queue'.")

    except Exception as e:
        print(f"FAILED to connect to KubeMQ: {e}")

@app.get("/health")
def health():
    return {"status": "ok", "kubemq": "connected" if kubemq_subscriber else "disconnected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
