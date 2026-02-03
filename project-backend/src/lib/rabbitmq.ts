// src/lib/rabbitmq.ts
import amqp from 'amqplib';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function publishToQueue(queueName: string, message: string) {
  try {
    if (!connection) {
      const url = 'amqp://admin:admin@localhost:5672'; 
      
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
