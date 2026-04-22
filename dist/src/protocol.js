"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2AProtocol = void 0;
const http = __importStar(require("http"));
const crypto_1 = require("crypto");
const transport_1 = require("./transport");
const types_1 = require("./types");
class A2AProtocol {
    constructor(agentId) {
        this.agentId = agentId;
        this.handlers = new Map();
    }
    on(type, fn) {
        const existing = this.handlers.get(type) || [];
        this.handlers.set(type, [...existing, fn]);
    }
    async send(toUrl, msg) {
        const full = {
            ...msg,
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
        };
        return (0, transport_1.postMessage)(toUrl, full);
    }
    async broadcast(urls, msg) {
        return Promise.all(urls.map((url) => this.send(url, msg)));
    }
    listen(port) {
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
                    const incoming = JSON.parse(body);
                    const handlers = this.handlers.get(incoming.type) || [];
                    const payload = handlers.length > 0
                        ? await handlers[0](incoming)
                        : { ok: true };
                    const reply = {
                        id: (0, crypto_1.randomUUID)(),
                        from: this.agentId,
                        to: incoming.from,
                        type: types_1.MessageType.RESPONSE,
                        payload,
                        timestamp: new Date().toISOString(),
                    };
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(reply));
                }
                catch (err) {
                    res.statusCode = 400;
                    res.end(String(err));
                }
            });
        });
        server.listen(port);
        return server;
    }
}
exports.A2AProtocol = A2AProtocol;
