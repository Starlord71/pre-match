import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';

/**
 * Integration test for the Phase 4 verification criterion: the poller detects a
 * live change, persists it in SQLite and emits `match:update` to the subscribed
 * client with the updated payload.
 *
 * The HTTP server runs on an ephemeral port with a real Socket.io client; the
 * database is a throwaway SQLite file.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-live-integration-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb } = await import('../../db/db.js');
const teamsRepository = await import('../../repositories/teams.repository.js');
const matchesRepository = await import('../../repositories/matches.repository.js');
const { createLivePoller } = await import('../livePoller.service.js');
const { registerLiveMatchHandlers, emitMatchUpdate } =
  await import('../../sockets/liveMatches.socket.js');

const KICKOFF = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const updatedExternalMatch = {
  id: 55,
  utcDate: KICKOFF,
  status: 'IN_PLAY',
  matchday: 1,
  homeTeam: { id: 1, name: 'Home FC', shortName: 'Home', tla: 'HOM' },
  awayTeam: { id: 2, name: 'Away FC', shortName: 'Away', tla: 'AWY' },
  score: {
    winner: null,
    duration: 'REGULAR',
    fullTime: { home: 2, away: 1 },
    halfTime: { home: 1, away: 0 },
  },
};

let httpServer;
let io;
let port;
let socket;

function connectClient() {
  return new Promise((resolve, reject) => {
    socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function emitWithAck(event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

describe('live poller + sockets integration', () => {
  beforeAll(async () => {
    migrate();
    teamsRepository.upsertMany([
      { id: 1, name: 'Home FC' },
      { id: 2, name: 'Away FC' },
    ]);
    matchesRepository.upsert({
      id: 55,
      league: 'PL',
      utcDate: KICKOFF,
      status: 'SCHEDULED',
      matchday: 1,
      homeTeamId: 1,
      awayTeamId: 2,
      winner: null,
      duration: null,
      fullTimeHome: null,
      fullTimeAway: null,
      halfTimeHome: null,
      halfTimeAway: null,
    });

    httpServer = http.createServer();
    io = new Server(httpServer);
    registerLiveMatchHandlers(io);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
  });

  afterAll(async () => {
    if (socket) socket.disconnect();
    await new Promise((resolve) => io.close(resolve));
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('persists the live change and pushes match:update to subscribers', async () => {
    const client = await connectClient();
    await emitWithAck('subscribe:match', 55);

    const received = new Promise((resolve) => client.once('match:update', resolve));

    const fakeClient = { getCompetitionMatches: async () => ({ matches: [updatedExternalMatch] }) };
    const poller = createLivePoller({
      client: fakeClient,
      emit: (match) => emitMatchUpdate(io, match),
    });

    await poller.tick();
    const payload = await received;

    expect(payload).toMatchObject({ id: 55, status: 'IN_PLAY', fullTimeHome: 2, fullTimeAway: 1 });
    expect(matchesRepository.findById(55)).toMatchObject({
      status: 'IN_PLAY',
      fullTimeHome: 2,
      fullTimeAway: 1,
    });
  });
});
