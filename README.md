# a2a-protocol

Lightweight agent-to-agent communication library. No dependencies.

## Install

```bash
npm install a2a-protocol
```

## Quick start (5 lines)

```typescript
import { A2AProtocol } from 'a2a-protocol';

// Create two agents
const agentA = new A2AProtocol({ agentId: 'a', agentName: 'Agent A', port: 4001 });
const agentB = new A2AProtocol({ agentId: 'b', agentName: 'Agent B', port: 4002 });

// Agent B handles incoming messages
agentB.on('request', async (msg) => ({ reply: `got: ${msg.payload}` }));

await agentB.listen();

// Agent A sends a message
const res = await agentA.send('http://localhost:4002', { text: 'hello' });
console.log(res.payload); // { received: true, reply: 'got: { text: hello }' }

agentA.close(); agentB.close();
```

## API

### `A2AProtocol`

```typescript
const agent = new A2AProtocol({
  agentId: 'my-agent',    // unique agent identifier
  agentName: 'My Agent',  // display name
  port: 4001,             // port to listen on
  hostname: '0.0.0.0',   // optional bind address
  defaultTimeoutMs: 5000, // timeout for send() calls
});

// Register handler for 'request', 'response', 'notify', 'broadcast', or '*'
agent.on('request', async (msg) => ({ /* return payload */ }));

// Start HTTP server
await agent.listen();

// Send request → wait for response
const res = await agent.send('http://localhost:4002', { key: 'value' });

// Fire-and-forget notification
await agent.notify('http://localhost:4002', { event: 'update' });

// Broadcast to multiple agents
await agent.broadcast(['http://localhost:4002', 'http://localhost:4003'], { event: 'broadcast' });

// Shutdown
agent.close();
```

## Message types

- `request` — sends payload, waits for response
- `response` — reply to a request (auto-generated on handler return)
- `notify` — fire-and-forget notification
- `broadcast` — message to all agents in a scope

## Demo

```bash
npx tsx example/two-agents.ts
# agent-B listening on port 4002
# agent-B received: hello
# agent-A got response: {"received":true,"reply":"pong at 2026-04-27T05:45:00.000Z"}
```

## Architecture

```
src/types.ts     — A2AMessage interface, MessageType enum, factory functions
src/transport.ts — HTTP server (built-in http module), send/receive logic
src/protocol.ts  — A2AProtocol class, high-level send/broadcast/notify
example/         — demo scripts
```

No external dependencies. Pure Node.js.