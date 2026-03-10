// src/lib/rabbitmq.ts
import amqp from 'amqplib';

const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'guest';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';

const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:5672?heartbeat=60`;

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;

function resetConnection() {
  channel = null;
  connection = null;
}

async function getChannel(): Promise<amqp.Channel> {
  // If we have a valid channel, return it
  if (channel) return channel;

  // Create connection if needed
  if (!connection) {
    console.log(`[RabbitMQ] Connecting to ${RABBITMQ_HOST}...`);
    connection = await amqp.connect(url);

    // Handle connection errors gracefully instead of crashing the process
    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error:', err.message);
      resetConnection();
    });

    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed. Will reconnect on next publish.');
      resetConnection();
    });
  }

  // Create channel
  channel = await connection.createChannel();

  channel.on('error', (err) => {
    console.error('[RabbitMQ] Channel error:', err.message);
    channel = null;
  });

  channel.on('close', () => {
    console.warn('[RabbitMQ] Channel closed.');
    channel = null;
  });

  return channel;
}

export async function publishToQueue(queueName: string, message: string) {
  try {
    const ch = await getChannel();

    // Ensure queue exists
    await ch.assertQueue(queueName, { durable: true });

    const sent = ch.sendToQueue(queueName, Buffer.from(message));

    if (sent) {
      console.log(`[RabbitMQ] Sent ticket #${queueName} to AI worker`);
    } else {
      console.error('[RabbitMQ] Buffer full!');
    }
  } catch (error: any) {
    console.error('[RabbitMQ] Publish Error:', error.message);
    // Reset so next call creates a fresh connection
    resetConnection();
  }
}
