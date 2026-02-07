import os
import json
import time
import threading
import traceback
import torch
from dotenv import load_dotenv
from fastapi import FastAPI
from supabase import create_client, Client
import pika

from transformers import pipeline
from sentence_transformers import SentenceTransformer

load_dotenv("./main.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
QUEUE_NAME = "ticket_processing_queue"

app = FastAPI()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Categories for Zero-Shot Classification
CANDIDATE_LABELS = ["General", "Network", "Hardware", "Software", "Access"]

SPECIALIST_MAP = {
    "Network": "ee2e5df3-cf47-4a91-b170-f50a65b3769e",  # Top
    "Hardware": "ee2e5df3-cf47-4a91-b170-f50a65b3769e", # Top
    "Software": "9e72b79f-c541-4d83-9477-04d932bf64c3", # In
    "Access": "5771ae1a-6506-43cc-bbf5-892c5acf6faa",   # ChingChing
}

print("Loading AI Models... (This happens only once)")

try:
    # A. Zero-Shot Classifier (Categorization)
    print("Loading Classifier (Zero-Shot)...")
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

    # B. Summarization Model (Smart Titles)
    print("Loading Summarizer...")
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

    print("Loading Embedder...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")

    print("✅ AI Models Ready!")

except Exception as e:
    print(f"❌ Model loading failed: {e}")
    traceback.print_exc()

def predict_category(text: str):
    try:
        result = classifier(text, candidate_labels=CANDIDATE_LABELS)

        # Result format: {'labels': ['Hardware', ...], 'scores': [0.98, ...]}
        top_category = result['labels'][0]
        confidence = result['scores'][0]

        # If confidence is too low, fallback to General
        if confidence < 0.3:
            return "General", confidence

        return top_category, confidence
    except Exception as e:
        print(f"Classification Error: {e}")
        return "General", 0.0

def generate_smart_title(description: str) -> str:
    try:
        if len(description) < 50:
            return description

        # Generate summary (max 20 words, min 5 words)
        summary = summarizer(description, max_length=20, min_length=5, do_sample=False)
        title = summary[0]['summary_text']

        # Clean up trailing punctuation
        if title.endswith('.'):
            title = title[:-1]

        return title.strip()
    except Exception as e:
        print(f"Summarizer failed: {e}")

        return description.split('.')[0][:60] + "..."

def get_similar_solutions(text: str) -> str:

    try:
        vector = embedder.encode(text).tolist()

        res = supabase.rpc(
            "match_tickets",
            {
                "query_embedding": vector,
                "match_threshold": 0.75,
                "match_count": 3
            }
        ).execute()

        if not res.data:
            return "No similar past tickets found."

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

    # 1. Classify Category (Using Zero-Shot)
    category, confidence = predict_category(description)
    
    # 2. Generate Smart Title (Using Summarizer)
    smart_title = generate_smart_title(description)

    # 3. Recommend Solutions (Vector Search)
    recommendations = get_similar_solutions(description)

    # 4. Embed Description (for future search)
    embedding = embedder.encode(description).tolist()

    # 5. Determine Assignee
    assigned_to_uuid = SPECIALIST_MAP.get(category, None)

    # 6. Construct Response
    ai_response = {
        "title": smart_title,
        "category": category,
        "ai_solution": f"AI Suggested Next Steps:\n{recommendations}",
        "assigned_to": assigned_to_uuid,
        "embedding": embedding,
        "status": "DRAFT",
        "updated_at": "now()"
    }

    # Update Database
    supabase.table("tickets").update(ai_response).eq("id", ticket_id).execute()
    
    print(f"✅ Ticket #{ticket_id} Updated:")
    print(f"   Title: {smart_title}")
    print(f"   Category: {category} ({round(confidence*100)}%)")
    print(f"   Assigned: {assigned_to_uuid}")

def rabbitmq_callback(ch, method, properties, body):
    try:
        payload = json.loads(body)
        ticket_id = payload.get('ticket_id')
        description = payload.get('description')

        if ticket_id and description:
            process_ticket(ticket_id, description)
        else:
            print(" [!] Missing data in payload")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError:
        print(" [!] Error: Malformed JSON. Discarding message.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    except Exception as e:
        print(f" [!] Worker Logic Error: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_consumer():
    """Connects to RabbitMQ and starts the blocking consumer loop."""
    print(f"Connecting to RabbitMQ at {RABBITMQ_HOST}...")
    while True:
        try:
            credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
            parameters = pika.ConnectionParameters(
                host=RABBITMQ_HOST, 
                port=RABBITMQ_PORT, 
                credentials=credentials,
                heartbeat=600
            )
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=rabbitmq_callback)

            print("AI Worker Listening for new tickets (RabbitMQ)...")
            channel.start_consuming()

        except Exception: 
            print("RabbitMQ Connection Failed. Retrying in 5s...")
            traceback.print_exc()
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()

@app.get("/health")
def health_check():
    return {"status": "AI Worker Running", "models": "loaded"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
