// Two-agent demo: agent-A sends a message, agent-B receives and replies

import { A2AProtocol } from '../src/protocol.js';

async function main() {
  const agentA = new A2AProtocol({
    agentId: 'agent-a',
    agentName: 'Agent A',
    port: 4001,
  });

  const agentB = new A2AProtocol({
    agentId: 'agent-b',
    agentName: 'Agent B',
    port: 4002,
  });

  // Agent B registers a request handler
  agentB.on('request', async (msg) => {
    const payload = msg.payload as { text?: string };
    console.log(`agent-B received: ${payload.text ?? msg.payload}`);
    return { received: true, reply: `pong at ${new Date().toISOString()}` };
  });

  // Start Agent B listening
  await agentB.listen();
  console.log('agent-B listening on port 4002');

  // Agent A sends a request to Agent B
  const response = await agentA.send('http://localhost:4002', { text: 'hello' });
  console.log(`agent-A got response: ${JSON.stringify(response.payload)}`);

  // Cleanup
  agentA.close();
  agentB.close();
}

main().catch(console.error);