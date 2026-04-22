import { A2AProtocol } from '../src';
import { MessageType } from '../src/types';

async function testTwoAgents() {
  const agentB = new A2AProtocol('agent-B');
  agentB.on(MessageType.REQUEST, (msg) => {
    console.log(`agent-B received: ${(msg.payload as any).text}`);
    return { ok: true, echo: (msg.payload as any).text };
  });

  const server = agentB.listen(3003);
  await new Promise((r) => setTimeout(r, 500));

  const agentA = new A2AProtocol('agent-A');
  const reply = await agentA.send('http://localhost:3003/receive', {
    from: 'agent-A',
    to: 'agent-B',
    type: MessageType.REQUEST,
    payload: { text: 'hello' },
  });

  console.log(`agent-A got reply: ${JSON.stringify(reply)}`);
  server.close();
  process.exit(0);
}

testTwoAgents().catch((e) => { console.error(e); process.exit(1); });
