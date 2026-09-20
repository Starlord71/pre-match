# Pre-match — Server (API)

[English](README.md) | [Español](README.es.md)

Backend API for the pre-match analysis tool.

> **Status:** phases 1-4 implemented and covered by tests: Express base, SQLite with migrations, football-data.org client with rate limiting, the sync flow, the four-signal analysis engine and real-time match updates over Socket.io. The React client (phase 5) and Docker packaging (phase 7) are still _WIP_.

## Tech stack

| Concern        | Technology                          |
| -------------- | ----------------------------------- |
| Runtime        | Node.js (ESM)                       |
| HTTP framework | Express 4                           |
| Database       | SQLite via `better-sqlite3`         |
| Real time      | Socket.io                           |
| Validation     | Zod                                 |
| Logging        | Morgan                              |
| Config         | dotenv                              |
| Testing        | Vitest + Supertest                  |

## Requirements

- Node.js (LTS)
- pnpm `11.3.0`

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable                | Description                       | Default                  |
| ----------------------- | --------------------------------- | ------------------------ |
| `PORT`                  | HTTP port the server listens on   | `3000`                   |
| `NODE_ENV`              | Runtime environment               | `development`            |
| `FOOTBALL_DATA_API_KEY` | API key for football-data.org     | `''`                     |
| `DB_PATH`               | Path to the SQLite database file  | `./data/prematch.sqlite` |

These are read and centralized in `src/config/env.js`.

## Scripts

| Script              | Description                                 |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | Start with `node --watch` (auto reload)     |
| `pnpm start`        | Start once                                  |
| `pnpm test`         | Run the test suite once (Vitest)            |
| `pnpm test:watch`   | Run tests in watch mode                     |
| `pnpm lint`         | Syntax check `src/server.js` (`node --check`) |

## Project structure

```
server/
├── src/
│   ├── server.js                 # Entry point: HTTP server + Socket.io + live poller
│   ├── app.js                    # Builds the Express app (middleware + routes)
│   ├── config/
│   │   └── env.js
│   ├── routes/                   # Express routers
│   │   ├── health.routes.js
│   │   ├── sync.routes.js
│   │   └── analysis.routes.js
│   ├── controllers/              # Request handlers
│   │   ├── health.controller.js
│   │   ├── sync.controller.js
│   │   └── analysis.controller.js
│   ├── schemas/                  # Zod schemas (domain model + external payloads)
│   │   ├── league.schema.js
│   │   ├── team.schema.js
│   │   ├── match.schema.js
│   │   ├── analysis.schema.js
│   │   └── externalApi.schema.js
│   ├── services/                 # Business logic
│   │   ├── sync.service.js
│   │   ├── livePoller.service.js
│   │   └── analysisEngine/       # The four independent signals
│   │       ├── index.js
│   │       ├── form.service.js
│   │       ├── homeAway.service.js
│   │       ├── h2h.service.js
│   │       └── schedule.service.js
│   ├── repositories/             # Data access (only modules that touch SQL)
│   │   ├── teams.repository.js
│   │   ├── matches.repository.js
│   │   └── cache.repository.js
│   ├── db/
│   │   ├── db.js                 # Connection + migration runner
│   │   └── migrations/
│   │       └── 001_init.sql
│   ├── external/                 # football-data.org client + rate limiter
│   │   ├── footballData.client.js
│   │   └── rateLimiter.js
│   └── sockets/                  # Socket.io handlers
│       └── liveMatches.socket.js
└── tests/                        # Unit + integration tests (Vitest/Supertest)
```

`app.js` is kept separate from `server.js` so the Express app can be imported in tests without opening a network port.

## API

Base URL: `http://localhost:3000` (configurable via `PORT`).

| Method | Path                                   | Description                        |
| ------ | -------------------------------------- | ---------------------------------- |
| `GET`  | `/health`                              | Service health status              |
| `POST` | `/api/sync/:league`                    | Sync one league from football-data |
| `GET`  | `/api/analysis?home=&away=&date=`      | Four signals for a fixture         |

### `GET /health`

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### `POST /api/sync/:league`

`:league` is one of `PL`, `PD`, `BL1`, `SA`, `FL1`. The service serves from the `api_cache` table when a fresh entry exists, otherwise fetches from football-data.org, validates the payload and upserts `teams` and `matches`. An unknown league returns `400`.

```json
{
  "league": "PL",
  "source": "api",
  "teams": 20,
  "matches": 380
}
```

### `GET /api/analysis?home=&away=&date=`

`home` and `away` are team ids and `date` is the ISO kickoff of the analyzed match. The four signals are returned as separate objects and are never fused into a single score. Invalid or missing parameters return `400`.

```json
{
  "homeTeamId": 1,
  "awayTeamId": 2,
  "matchDate": "2026-04-01T15:00:00Z",
  "form": {
    "home": {
      "teamId": 1,
      "windowSize": 5,
      "decay": 0.7,
      "matchesAnalyzed": 5,
      "weightedPoints": 8.51,
      "totalWeight": 2.77,
      "weightedScore": 0.61,
      "results": [
        { "matchId": 41, "utcDate": "2026-03-28T15:00:00Z", "result": "W", "points": 3, "weight": 1 }
      ]
    },
    "away": { "teamId": 2, "windowSize": 5, "decay": 0.7, "matchesAnalyzed": 5, "weightedPoints": 4.2, "totalWeight": 2.77, "weightedScore": 0.3, "results": [] }
  },
  "homeAway": {
    "home": { "teamId": 1, "venue": "HOME", "matchesPlayed": 10, "wins": 7, "draws": 2, "losses": 1, "points": 23, "pointsPerGame": 2.3, "winRate": 0.7, "goalsFor": 21, "goalsAgainst": 8, "goalDifference": 13 },
    "away": { "teamId": 2, "venue": "AWAY", "matchesPlayed": 10, "wins": 3, "draws": 3, "losses": 4, "points": 12, "pointsPerGame": 1.2, "winRate": 0.3, "goalsFor": 11, "goalsAgainst": 14, "goalDifference": -3 }
  },
  "h2h": {
    "teamAId": 1,
    "teamBId": 2,
    "matchesAnalyzed": 4,
    "minimumMatches": 3,
    "insufficientData": false,
    "meetings": [
      { "matchId": 12, "utcDate": "2025-11-02T15:00:00Z", "homeTeamId": 2, "awayTeamId": 1, "homeScore": 1, "awayScore": 2, "resultForTeamA": "W" }
    ],
    "summary": { "teamAWins": 2, "teamBWins": 1, "draws": 1, "goalsA": 6, "goalsB": 4 }
  },
  "schedule": {
    "home": { "teamId": 1, "upcomingMatchDate": "2026-04-01T15:00:00Z", "windowDays": 14, "threshold": 3, "matchesInWindow": 2, "congested": false, "daysSinceLastMatch": 4.2, "matches": [{ "matchId": 37, "utcDate": "2026-03-28T15:00:00Z", "daysBefore": 4.2, "venue": "HOME" }] },
    "away": { "teamId": 2, "upcomingMatchDate": "2026-04-01T15:00:00Z", "windowDays": 14, "threshold": 3, "matchesInWindow": 3, "congested": true, "daysSinceLastMatch": 2.8, "matches": [] }
  }
}
```

When a signal lacks enough history, it says so explicitly instead of guessing: `form.weightedScore` is `null` with zero matches analyzed and `h2h.insufficientData` is `true` below the minimum number of meetings.

Unknown routes return `404 { "error": "Not Found" }`. Errors are handled by a central error middleware returning `{ "error": "<message>" }`.

## Real-time (Socket.io)

Socket.io is attached to the same HTTP server. Clients subscribe per match; each match is a room named `match:{id}`, so subscribers only receive events for matches they asked for.

| Direction       | Event               | Payload                        | Description                                  |
| --------------- | ------------------- | ------------------------------ | -------------------------------------------- |
| Client → server | `subscribe:match`   | match id                       | Joins the room `match:{id}`                   |
| Client → server | `unsubscribe:match` | match id                       | Leaves the room `match:{id}`                  |
| Server → client | `match:update`      | stored match object             | Emitted when the live poller detects a change |

Both subscribe events accept an optional acknowledgement callback that receives `{ ok: true, room }`, or `{ ok: false }` for an invalid id.

The live poller checks every 60-90s whether any stored match is inside its live window (kickoff → kickoff + ~2h). It only calls football-data.org when there is at least one such match; requests go through the shared rate limiter (≤10 per minute). Detected state/score changes are persisted via `matches.repository.js` and broadcast as `match:update` to `match:{id}`.

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.emit('subscribe:match', 123);
socket.on('match:update', (match) => {
  console.log(match.id, match.status, match.fullTimeHome, match.fullTimeAway);
});
```

## Domain model

Defined with Zod in `src/schemas/`:

- **League** (`league.schema.js`): supported competition codes `PL`, `PD`, `BL1`, `SA`, `FL1`, with human-readable names.
- **Team** (`team.schema.js`): `id`, `name`, `shortName`, `tla` (3-letter code), `crest` (URL).
- **Match** (`match.schema.js`): `id`, `league`, `utcDate`, `status`, `matchday`, `homeTeam`, `awayTeam` and `score`.
  - Statuses: `SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`, `SUSPENDED`, `POSTPONED`, `CANCELLED`, `AWARDED`.
  - Score: `winner`, `duration` and the `fullTime` / `halfTime` breakdowns.

## Testing

Tests are written with Vitest and Supertest. Place test files next to the code or in a `__tests__` folder; run them with:

```bash
pnpm test
```

## Related documentation

- [Root README](../README.md)
- [Client README](../client/README.md)
