import { HttpTransport } from './transport.js';
import {
  A2AMessage,
  createRequest,
  createResponse,
  MessageHandler,
  MessageType,
} from './types.js';

export interface A2AProtocolOptions {
  agentId: string;
  agentName: string;
  port: number;
  hostname?: string;
  defaultTimeoutMs?: number;
}

export class A2AProtocol {
  private transport: HttpTransport;
  private agentId: string;
  private defaultTimeoutMs: number;
  private listenPort: number;
  private listenHostname: string;

  constructor(options: A2AProtocolOptions) {
    this.agentId = options.agentId;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5000;
    this.listenPort = options.port;
    this.listenHostname = options.hostname ?? '0.0.0.0';
    this.transport = new HttpTransport(options.agentId, options.agentName, options.port);
  }

  get agentUrl(): string {
    return this.transport.getAgentInfo().url;
  }

  get agentInfo() {
    return this.transport.getAgentInfo();
  }

  // Register a handler for a specific message type
  on(type: MessageType | '*', handler: MessageHandler): void {
    this.transport.on(type, handler);
  }

  // Remove handler
  off(type: MessageType): void {
    this.transport.off(type);
  }

  // Send a message and wait for response (request/response pattern)
  async send(targetUrl: string, payload: unknown, options?: { timeoutMs?: number }): Promise<A2AMessage> {
    const request = createRequest(this.agentId, targetUrl, payload);
    return this.transport.send(targetUrl + '/receive', request, options?.timeoutMs ?? this.defaultTimeoutMs);
  }

  // Send notification (fire-and-forget)
  async notify(targetUrl: string, payload: unknown): Promise<void> {
    const msg: A2AMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      from: this.agentId,
      to: targetUrl,
      type: 'notify',
      payload,
      timestamp: new Date().toISOString(),
    };
    try {
      await this.transport.send(targetUrl + '/receive', msg, 2000);
    } catch {
      // fire-and-forget, ignore errors
    }
  }

  // Broadcast to multiple agents
  async broadcast(targetUrls: string[], payload: unknown, scope?: string): Promise<void> {
    const msg: A2AMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      from: this.agentId,
      to: '*',
      type: 'broadcast',
      payload,
      timestamp: new Date().toISOString(),
      scope,
    } as any;
    await Promise.allSettled(
      targetUrls.map(url => this.transport.send(url + '/receive', msg, 2000))
    );
  }

  // Start listening for messages
  async listen(): Promise<void> {
    return this.transport.listen(this.listenPort, this.listenHostname);
  }

  // Stop listening
  close(): void {
    this.transport.close();
  }
}

// Convenience: create two agents that talk to each other
export async function demo(): Promise<void> {
  const agentA = new A2AProtocol({
    agentId: 'agent-a',
    agentName: 'Agent A',
    port: 3001,
  });

  const agentB = new A2AProtocol({
    agentId: 'agent-b',
    agentName: 'Agent B',
    port: 3002,
  });

  // Agent B handles 'request' messages
  agentB.on('request', async (msg) => {
    console.log(`agent-B received: ${JSON.stringify(msg.payload)}`);
    return { received: true, reply: `pong at ${new Date().toISOString()}` };
  });

  // Start both agents
  await agentB.listen();

  // Agent A sends a message to Agent B
  const response = await agentA.send('http://localhost:3002', { text: 'ping' });
  console.log(`agent-A got response: ${JSON.stringify(response.payload)}`);

  // Cleanup
  agentA.close();
  agentB.close();
}