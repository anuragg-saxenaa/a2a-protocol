import * as http from 'http';
import { A2AMessage, MessageHandler, AgentInfo } from './types.js';

export interface TransportOptions {
  port?: number;
  hostname?: string;
}

export class HttpTransport {
  private server: http.Server | null = null;
  private handlers: Map<string, MessageHandler> = new Map();
  private agentInfo: AgentInfo;
  private pendingRequests: Map<string, {
    resolve: (msg: A2AMessage) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(agentId: string, agentName: string, port: number) {
    this.agentInfo = {
      id: agentId,
      name: agentName,
      url: `http://localhost:${port}`,
      capabilities: [],
    };
  }

  getAgentInfo(): AgentInfo {
    return this.agentInfo;
  }

  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  off(type: string): void {
    this.handlers.delete(type);
  }

  async send(targetUrl: string, msg: A2AMessage, timeoutMs: number = 5000): Promise<A2AMessage> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(msg);
      const url = new URL(targetUrl);
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Agent-Id': this.agentInfo.id,
        },
      };

      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error(`Request to ${targetUrl} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          clearTimeout(timeout);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(data) as A2AMessage;
              resolve(response);
            } catch {
              reject(new Error(`Invalid JSON response from ${targetUrl}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  listen(port: number, hostname: string = '0.0.0.0'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', agent: this.agentInfo.id }));
          return;
        }

        if (req.method === 'GET' && req.url === '/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.agentInfo));
          return;
        }

        if (req.method !== 'POST' || req.url !== '/receive') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const msg = JSON.parse(body) as A2AMessage;
            
            // Route to handler
            const handler = this.handlers.get(msg.type) || this.handlers.get('*');
            
            if (handler) {
              const result = await handler(msg);
              
              // Auto-respond if it's a request
              if (msg.type === 'request') {
                const response: A2AMessage = {
                  id: `${Date.now()}-response`,
                  from: this.agentInfo.id,
                  to: msg.from,
                  type: 'response',
                  payload: result,
                  timestamp: new Date().toISOString(),
                  correlationId: msg.correlationId || msg.id,
                  success: true,
                } as any;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ received: true }));
              }
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ received: true, no_handler: true }));
            }
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid message format' }));
          }
        });
      });

      this.server.on('error', reject);
      this.server.listen(port, hostname, () => {
        this.agentInfo.url = `http://localhost:${port}`;
        resolve();
      });
    });
  }

  close(): void {
    this.server?.close();
    this.server = null;
  }
}