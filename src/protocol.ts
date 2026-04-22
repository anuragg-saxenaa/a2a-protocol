import * as http from 'http';
import { randomUUID } from 'crypto';
import { postMessage } from './transport';
import { A2AMessage, MessageType } from './types';

type Handler = (msg: A2AMessage) => unknown | Promise<unknown>;

export class A2AProtocol {
  private handlers = new Map<MessageType, Handler[]>();

  constructor(public readonly agentId: string) {}

  on(type: MessageType, fn: Handler): void {
    const existing = this.handlers.get(type) || [];
    this.handlers.set(type, [...existing, fn]);
  }

  async send(toUrl: string, msg: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage> {
    const full: A2AMessage = {
      ...msg,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    return postMessage(toUrl, full) as Promise<A2AMessage>;
  }

  async broadcast(urls: string[], msg: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage[]> {
    return Promise.all(urls.map((url) => this.send(url, msg)));
  }

  listen(port: number): http.Server {
    const server = http.createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/receive') {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const incoming = JSON.parse(body) as A2AMessage;
          const handlers = this.handlers.get(incoming.type) || [];
          const payload = handlers.length > 0
            ? await handlers[0](incoming)
            : { ok: true };
          const reply: A2AMessage = {
            id: randomUUID(),
            from: this.agentId,
            to: incoming.from,
            type: MessageType.RESPONSE,
            payload,
            timestamp: new Date().toISOString(),
          };
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(reply));
        } catch (err) {
          res.statusCode = 400;
          res.end(String(err));
        }
      });
    });
    server.listen(port);
    return server;
  }
}
