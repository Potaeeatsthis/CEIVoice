// src/lib/rabbitmq.ts
import amqp from 'amqplib';
import dotenv from 'dotenv';

const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'guest';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';

const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:5672`;

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function publishToQueue(queueName: string, message: string) {
  try {
    if (!connection) {

      console.log(`[RabbitMQ] Connecting to ${url}...`);
      connection = await amqp.connect(url);
    }

    if (!channel) {
      channel = await connection.createChannel();
    }

    // Ensure queue exists (durable: false matches default Pika/Python)
    await channel.assertQueue(queueName, { durable: true });

    const sent = channel.sendToQueue(queueName, Buffer.from(message));
    
    if (sent) {
       // This matches the log format you see, confirming this code is running
       console.log(`[RabbitMQ] Sent ticket #${queueName} to AI worker`);
    } else {
       console.error('[RabbitMQ] Buffer full!');
    }

  } catch (error) {
    console.error('[RabbitMQ] Connection Error:', error);
  }
}
