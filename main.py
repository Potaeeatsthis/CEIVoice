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

from transformers import BertTokenizer, BertForSequenceClassification
from sentence_transformers import SentenceTransformer

load_dotenv("./main.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "admin")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "CEIVoice@2025!")
QUEUE_NAME = "ticket_processing_queue"

app = FastAPI()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Loading AI Models... (This happens only once)")

ID2LABEL = {0: "Billing", 1: "Technical Support"}
MODEL_PATH = "./trained_ticket_model"

if os.path.exists(MODEL_PATH):
    print(f"Loading Custom Model from {MODEL_PATH}...")
    tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
    classifier = BertForSequenceClassification.from_pretrained(MODEL_PATH)
else:
    print("Warning: Custom model not found. Loading default BERT (untrained).")
    tokenizer = BertTokenizer.from_pretrained("google-bert/bert-base-uncased")
    classifier = BertForSequenceClassification.from_pretrained(
        "google-bert/bert-base-uncased",
        num_labels=len(ID2LABEL)
    )

classifier.eval() # inference mode

# Optional: Move to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
classifier.to(device)
print(f"Classifier loaded on {device}")

embedder = SentenceTransformer("all-MiniLM-L6-v2")
print("AI Models Ready!")

def predict_category(text: str) -> str:
    """Uses BERT to classify the ticket text into Technical Support or Billing."""
    # Ensure inputs are moved to the same device as the model
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    inputs = {key: val.to(device) for key, val in inputs.items()}
    
    with torch.no_grad():
        outputs = classifier(**inputs)
        
    # Get the index with the highest score
    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    confidence, predicted_id = torch.max(probs, dim=-1)
    
    if confidence < 0.6 :
        return "General"
    else :
        return ID2LABEL[predicted_id.item()]

def predict_tags(text: str) -> list:
    """
    Scans the text for keywords to assign Scope Tags:
    IT, HR, Finance, Database, IT Operations
    """
    text_lower = text.lower()
    tags = []
    
    # Keyword mapping for your specific tags
    keywords = {
        "Database": ["database", "sql", "postgres", "mongo", "query", "backup", "data"],
        "HR": ["hr", "human resources", "salary", "payroll", "leave", "hiring", "contract"],
        "Finance": ["finance", "billing", "invoice", "payment", "cost", "budget", "tax"],
        "IT Operations": ["operations", "devops", "server", "deployment", "aws", "cloud", "pipeline", "infrastructure"],
        "IT": ["it", "support", "computer", "laptop", "software", "hardware", "vpn", "login", "wifi"]

    }

    for tag, keys in keywords.items():
        if any(key in text_lower for key in keys):
            tags.append(tag)
            
    return tags if tags else []

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

    # 1. Classify Category (Technical Support / Billing)
    category = predict_category(description)
    
    # 2. Predict Scope Tags (IT, HR, Finance, etc.)
    tags = predict_tags(description)

    # 3. Recommend
    recommendations = get_similar_solutions(description)

    # 4. Embed (for future search)
    embedding = embedder.encode(description).tolist()

    # 5. Construct Response
    # We include the detected tags in the summary or a specific field
    ai_response = {
        "title": f"[{category}] Automated Ticket",
        "summary": f"Category: {category} | Tags: {', '.join(tags)}\nIssue: {description}",
        "ai_solution": f"AI Suggested Next Steps:\n{recommendations}",
        "category": category,
        "embedding": embedding,
        "status": "NEW",
        "updated_at": "now()"
    }

    # Update Database
    supabase.table("tickets").update(ai_response).eq("id", ticket_id).execute()
    print(f"Ticket #{ticket_id} Updated! [Category: {category}, Tags: {tags}]")

def rabbitmq_callback(ch, method, properties, body):
    try:
        print(f" [x] Received {body}")
        payload = json.loads(body)
        ticket_id = payload.get('ticket_id')
        description = payload.get('description')

        if ticket_id and description:
            process_ticket(ticket_id, description)
            print(f" [x] Done processing Ticket {ticket_id}")
        else:
            print(" [!] Missing data in payload")

        # Ack valid processing
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError:
        print(" [!] Error: Malformed JSON. Discarding message.")
        # Do not requeue malformed JSON, it will never work.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    except Exception as e:
        print(f" [!] Worker Logic Error: {e}")
        # Safer default: Discard (requeue=False) and log error so the queue doesn't get stuck.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_consumer():
    """Connects to RabbitMQ and starts the blocking consumer loop."""
    print(f"Connecting to RabbitMQ at {RABBITMQ_HOST}...")
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST, 
            port=RABBITMQ_PORT, 
            credentials=credentials,
            heartbeat=600 # High heartbeat because AI tasks might take time
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        # Declare the queue (idempotent: creates if not exists)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)

        # Set QoS: Process 1 message at a time to avoid overwhelming the CPU
        channel.basic_qos(prefetch_count=1)

        channel.basic_consume(queue=QUEUE_NAME, on_message_callback=rabbitmq_callback)

        print("AI Worker Listening for new tickets (RabbitMQ)...")
        channel.start_consuming()

    except Exception : 
        print("RabbitMQ Connection Failed. Detailed Traceback:")
        traceback.print_exc()
        time.sleep(5)

@app.on_event("startup")
def startup_event():
    """Starts the RabbitMQ consumer in a background thread."""
    # We run pika in a separate thread because channel.start_consuming() is blocking
    # and would otherwise freeze the FastAPI health check endpoint.
    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()

@app.get("/health")
def health_check():
    return {"status": "AI Worker Running", "models": "loaded"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
