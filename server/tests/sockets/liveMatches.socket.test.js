import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import {
  registerLiveMatchHandlers,
  emitMatchUpdate,
  matchRoom,
} from '../../src/sockets/liveMatches.socket.js';

/**
 * Socket.io tests against a real server on an ephemeral port.
 *
 * A throwaway HTTP server is created per file; clients connect with
 * `socket.io-client` and subscriptions are acknowledged so assertions never
 * race the server-side `socket.join`.
 */
let httpServer;
let io;
let port;
const clients = [];

function connectClient() {
  return new Promise((resolve, reject) => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clients.push(client);
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}

function roomMembers(room) {
  return io.sockets.adapter.rooms.get(room) ?? new Set();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('liveMatches.socket', () => {
  beforeAll(async () => {
    httpServer = http.createServer();
    io = new Server(httpServer);
    registerLiveMatchHandlers(io);

    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
  });

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
  });

  it('joins the room of the requested match', async () => {
    const client = await connectClient();

    const ack = await emitWithAck(client, 'subscribe:match', 123);

    expect(ack).toEqual({ ok: true, room: matchRoom(123) });
    expect(roomMembers(matchRoom(123)).has(client.id)).toBe(true);
  });

  it('leaves the room on unsubscribe', async () => {
    const client = await connectClient();

    await emitWithAck(client, 'subscribe:match', 456);
    expect(roomMembers(matchRoom(456)).has(client.id)).toBe(true);

    const ack = await emitWithAck(client, 'unsubscribe:match', 456);

    expect(ack).toEqual({ ok: true, room: matchRoom(456) });
    expect(roomMembers(matchRoom(456)).has(client.id)).toBe(false);
  });

  it('keeps updates isolated between two different matches', async () => {
    const first = await connectClient();
    const second = await connectClient();

    await emitWithAck(first, 'subscribe:match', 1);
    await emitWithAck(second, 'subscribe:match', 2);

    const firstReceived = [];
    const secondReceived = [];
    first.on('match:update', (payload) => firstReceived.push(payload));
    second.on('match:update', (payload) => secondReceived.push(payload));

    emitMatchUpdate(io, { id: 1, status: 'IN_PLAY', fullTimeHome: 1, fullTimeAway: 0 });
    await delay(50);

    expect(firstReceived).toHaveLength(1);
    expect(firstReceived[0]).toMatchObject({ id: 1, status: 'IN_PLAY' });
    expect(secondReceived).toHaveLength(0);
  });
});
