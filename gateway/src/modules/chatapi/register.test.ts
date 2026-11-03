import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { once } from 'events';
import WebSocket, { WebSocketServer } from 'ws';
import { describe, expect, it, vi } from 'vitest';

import { registerChatApiRoutes, registerChatApiWebSocket } from './register';

const mocks = vi.hoisted(() => ({ 'find': vi.fn(), 'chat': vi.fn(), 'chatNoSave': vi.fn() }));
vi.mock('../../config/couch.config', () => ({ 'configurationDB': { 'find': mocks.find } }));
vi.mock('./services/chat.service', () => ({ 'chat': mocks.chat, 'chatNoSave': mocks.chatNoSave }));

describe('community chat policy', () => {
  it('checks each HTTP prompt and each message on an existing socket before dispatch', async () => {
    const app = express();
    app.use(express.json());
    registerChatApiRoutes(app);
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });
    registerChatApiWebSocket(wss);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = `127.0.0.1:${(server.address() as AddressInfo).port}`;
    const ws = new WebSocket(`ws://${address}`);
    const data = { 'content': 'hello' };
    const post = (save: boolean) => fetch(`http://${address}/`, {
      'method': 'POST', 'headers': { 'Content-Type': 'application/json' }, 'body': JSON.stringify({ data, save })
    });
    const send = async () => {
      const reply = once(ws, 'message');
      ws.send(JSON.stringify(data));
      return JSON.parse((await reply)[0].toString());
    };
    try {
      await once(ws, 'open');
      mocks.find.mockResolvedValue({ 'docs': [ { '_id': 'local' } ] });
      mocks.chat.mockResolvedValue({ 'completionText': 'hello' });
      expect((await send()).type).toBe('final');
      mocks.find.mockResolvedValue({ 'docs': [ { '_id': 'local', 'chatEnabled': false } ] });
      expect((await post(true)).status).toBe(403);
      expect((await post(false)).status).toBe(403);
      expect((await send()).error).toBe('Chat Disabled');
      mocks.find.mockResolvedValue({ 'docs': [] });
      expect((await post(false)).status).toBe(503);
      mocks.find.mockRejectedValueOnce(new Error('offline'));
      expect((await send()).error).toBe('Service Unavailable');
      expect(mocks.chat).toHaveBeenCalledTimes(1);
      expect(mocks.chatNoSave).not.toHaveBeenCalled();
      mocks.find.mockResolvedValue({ 'docs': [ { '_id': 'local', 'chatEnabled': true } ] });
      expect((await post(false)).status).toBe(200);
      expect(mocks.chatNoSave).toHaveBeenCalledTimes(1);
    } finally {
      ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
