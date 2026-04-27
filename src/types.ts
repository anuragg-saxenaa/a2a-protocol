// A2A Message types and interfaces

export type MessageType = 'request' | 'response' | 'notify' | 'broadcast';

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: unknown;
  timestamp: string;
  correlationId?: string; // for correlating response to request
}

export interface A2ARequest extends A2AMessage {
  type: 'request';
  correlationId: string;
  replyTo?: string; // URL to send response to
}

export interface A2AResponse extends A2AMessage {
  type: 'response';
  correlationId: string;
  success: boolean;
  error?: string;
}

export interface A2ANotify extends A2AMessage {
  type: 'notify';
}

export interface A2ABroadcast extends A2AMessage {
  type: 'broadcast';
  scope?: string; // e.g. 'channel', 'room', 'global'
}

export type MessageHandler = (msg: A2AMessage) => unknown | Promise<unknown>;

export interface AgentInfo {
  id: string;
  name: string;
  url: string;
  capabilities?: string[];
}

export function createMessage(
  type: MessageType,
  from: string,
  to: string,
  payload: unknown,
  options?: { correlationId?: string; scope?: string }
): A2AMessage {
  return {
    id: generateId(),
    from,
    to,
    type,
    payload,
    timestamp: new Date().toISOString(),
    ...(options?.correlationId && { correlationId: options.correlationId }),
    ...(options?.scope && { scope: options.scope }),
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRequest(
  from: string,
  to: string,
  payload: unknown,
  replyTo?: string
): A2ARequest {
  const id = generateId();
  return {
    id,
    from,
    to,
    type: 'request',
    payload,
    timestamp: new Date().toISOString(),
    correlationId: id,
    ...(replyTo && { replyTo }),
  };
}

export function createResponse(
  from: string,
  to: string,
  correlationId: string,
  payload: unknown,
  success: boolean = true,
  error?: string
): A2AResponse {
  return {
    id: generateId(),
    from,
    to,
    type: 'response',
    payload,
    timestamp: new Date().toISOString(),
    correlationId,
    success,
    ...(error && { error }),
  };
}

export function isRequest(msg: A2AMessage): msg is A2ARequest {
  return msg.type === 'request';
}

export function isResponse(msg: A2AMessage): msg is A2AResponse {
  return msg.type === 'response';
}