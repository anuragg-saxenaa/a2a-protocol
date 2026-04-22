import * as http from 'http';
import { A2AMessage, MessageType } from './types';
type Handler = (msg: A2AMessage) => unknown | Promise<unknown>;
export declare class A2AProtocol {
    readonly agentId: string;
    private handlers;
    constructor(agentId: string);
    on(type: MessageType, fn: Handler): void;
    send(toUrl: string, msg: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage>;
    broadcast(urls: string[], msg: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage[]>;
    listen(port: number): http.Server;
}
export {};
