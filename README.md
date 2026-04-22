# A2A Protocol

Lightweight TypeScript protocol for agent-to-agent request/response messaging over HTTP.

## Install

```bash
npm install
```

## Usage

```ts
import { A2AProtocol, MessageType } from "./src/protocol";

const agent = new A2AProtocol("agent-A");
agent.on(MessageType.REQUEST, (msg) => ({ ok: true, echo: msg.payload }));
agent.listen(3001);

await agent.send("http://localhost:3002/receive", {
  from: "agent-A", to: "agent-B", type: MessageType.REQUEST, payload: { text: "hello" }
});
```

## Run Demo

```bash
npm start
```

Starts two agents — agent-A sends a message to agent-B, which replies and prints "agent-B received: hello".
