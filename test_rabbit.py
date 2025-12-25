import pika
import json
import os
from dotenv import load_dotenv

load_dotenv("./main.env")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
QUEUE_NAME = "ticket_processing_queue"

def send_test_ticket():
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.queue_declare(queue=QUEUE_NAME, durable=True)

        payload = {
            "ticket_id": 101, 
            "description": "The printer on the 2nd floor is jamming and making a loud noise when printing PDF files."
        }
        message_body = json.dumps(payload)

        channel.basic_publish(
            exchange='',
            routing_key=QUEUE_NAME,
            body=message_body,
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent (saved to disk)
            )
        )

        print(f" [x] Sent payload: {message_body}")

        connection.close()

    except Exception as e:
        print(f"❌ Error sending message: {e}")

if __name__ == "__main__":
    send_test_ticket()
