import os
import json
import time
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

# Load Config
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
KUBEMQ_ADDRESS = os.getenv("KUBEMQ_ADDRESS", "localhost:50000")

# Initialize FastAPI (for Health Checks)
app = FastAPI()

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global AI Models (Loaded on Startup)
print("⏳ Loading AI Models... (This happens only once)")
ID2LABEL = {0: "Technical", 1: "Billing", 2: "General"}

tokenizer = BertTokenizer.from_pretrained("google-bert/bert-base-uncased")
classifier = BertForSequenceClassification.from_pretrained(
    "google-bert/bert-base-uncased",
    num_labels=len(ID2LABEL)
)
classifier.eval() # Set to inference mode

embedder = SentenceTransformer("all-MiniLM-L6-v2")
print("AI Models Ready!")

def predict_category(text: str) -> str:
    """Uses BERT to classify the ticket text."""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        outputs = classifier(**inputs)
    # Get the index with the highest score
    predicted_id = torch.argmax(outputs.logits, dim=1).item()
    return ID2LABEL[predicted_id]

def get_similar_solutions(text: str) -> str:
    """Uses Supabase Vector Search to find solved tickets."""
    try:
        # Convert text to 384-dim vector
        vector = embedder.encode(text).tolist()

        # Call the Postgres function (defined in your SQL)
        res = supabase.rpc(
            "match_tickets",
            {
                "query_embedding": vector,
                "match_threshold": 0.75, # 75% similarity required
                "match_count": 3
            }
        ).execute()

        if not res.data:
            return "No similar past tickets found."

        # Format the list of found solutions
        solutions = []
        for ticket in res.data:
            solutions.append(f"- (Ticket #{ticket['id']}) {ticket['ai_solution']}")

        return "\n".join(solutions)

    except Exception as e:
        print(f"Recommendation Error: {e}")
        return "Recommendations unavailable."

def process_ticket(ticket_id: int, description: str):
    """Orchestrates the AI tasks."""
    print(f"Processing Ticket #{ticket_id}...")

    # Classify
    category = predict_category(description)

    # Recommend
    recommendations = get_similar_solutions(description)

    # Embed (for future search)
    embedding = embedder.encode(description).tolist()

    # Construct Response
    ai_response = {
        "title": f"[{category}] Automated Ticket",
        "summary": f"User reported a {category} issue: {description[:60]}...",
        "ai_solution": f"AI Suggested Next Steps:\n{recommendations}",
        "category": category,
        "embedding": embedding,
        "status": "DRAFT",
        "updated_at": "now()"
    }

    # Update Database
    supabase.table("tickets").update(ai_response).eq("id", ticket_id).execute()
    print(f"Ticket #{ticket_id} Updated!")

def handle_incoming_event(event):
    """Callback when Express sends a message."""
    try:
        if not event.body: 
            return

        # Decode JSON
        body = json.loads(event.body.decode('utf-8'))
        ticket_id = body.get('ticket_id')
        description = body.get('description')

        if ticket_id and description:
            process_ticket(ticket_id, description)

    except Exception as e:
        print(f"❌ Worker Logic Error: {e}")

def on_error(msg):
    print(f"KubeMQ Error: {msg}")

@app.on_event("startup")
def startup_event():
    """Starts the subscriber background listener."""
    print(f"Connecting to KubeMQ at {KUBEMQ_ADDRESS}...")
    try:
        subscriber = Subscriber(KUBEMQ_ADDRESS)

        # Subscribe to the same channel Express publishes to
        sub_request = SubscribeRequest(
            channel="ticket_processing_queue",
            client_id="ai-worker-v1",
            events_store_type=EventsStoreType.Undefined,
            group="ai_workers_group",
            subscribe_type=SubscribeType.Events
        )

        subscriber.subscribe_to_events(sub_request, handle_incoming_event, on_error)
        print("AI Worker Listening for new tickets...")

    except Exception as e:
        print(f"Connection Failed: {e}")

# Health Check for Docker/K8s
@app.get("/health")
def health_check():
    return {"status": "AI Worker Running", "models": "loaded"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
