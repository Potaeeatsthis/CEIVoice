import amqp from 'amqplib';

const QUEUE_NAME = 'ticket_processing_queue';

export async function publishToQueue(ticketId: number, description: string) {
  try {
    const connection = await amqp.connect({
      protocol: 'amqp',
      hostname: process.env.RABBITMQ_HOST,
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASS,
    });

    const channel = await connection.createChannel();

    // Ensure queue exists (idempotent)
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    const payload = JSON.stringify({ ticket_id: ticketId, description });

    channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), {
      persistent: true, // Survive broker restarts
    });

    console.log(`[RabbitMQ] Sent ticket #${ticketId} to AI worker`);

    setTimeout(() => {
      channel.close();
      connection.close();
    }, 500);

  } catch (error) {
    console.error('[RabbitMQ] Error publishing message:', error);
    throw new Error('Failed to queue AI task');
  }
}
