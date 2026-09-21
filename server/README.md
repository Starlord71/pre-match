# Pre-match — Server (API)

[English](README.md) | [Español](README.es.md)

Backend API for the pre-match analysis tool.

> **Status:** phases 1-5 implemented and covered by tests: Express base, SQLite with migrations, football-data.org client with rate limiting, the sync flow, the three-signal analysis engine, real-time match updates over Socket.io and the teams and matches endpoints consumed by the React client. Docker packaging (phase 7) is still _WIP_.

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
│   │   ├── teams.routes.js
│   │   ├── matches.routes.js
│   │   ├── sync.routes.js
│   │   └── analysis.routes.js
│   ├── controllers/              # Request handlers
│   │   ├── health.controller.js
│   │   ├── teams.controller.js
│   │   ├── matches.controller.js
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
│   │   └── analysisEngine/       # The three independent signals + fixture resolution
│   │       ├── index.js
│   │       ├── form.service.js
│   │       ├── homeAway.service.js
│   │       ├── schedule.service.js
│   │       └── fixture.service.js
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
│   ├── sockets/                  # Socket.io handlers
│   │   └── liveMatches.socket.js
│   └── test/                     # Shared test fixtures
```

Tests live in `__tests__/` folders co-located with each module (`routes/__tests__`, `services/__tests__`, `services/analysisEngine/__tests__`, `repositories/__tests__`, `sockets/__tests__`, `external/__tests__`).

`app.js` is kept separate from `server.js` so the Express app can be imported in tests without opening a network port.

## API

Base URL: `http://localhost:3000` (configurable via `PORT`).

| Method | Path                                   | Description                        |
| ------ | -------------------------------------- | ---------------------------------- |
| `GET`  | `/health`                              | Service health status              |
| `GET`  | `/api/teams?league=`                   | Teams that played in a league      |
| `GET`  | `/api/matches?league=`                 | League current + next matchday with their matches |
| `POST` | `/api/sync/:league`                    | Sync one league from football-data |
| `GET`  | `/api/analysis?home=&away=`            | Three signals for a pairing, plus the resolved real fixture |

### `GET /health`

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### `GET /api/teams?league=`

`league` is one of `PL`, `PD`, `BL1`, `SA`, `FL1`. Because `teams` has no league column, membership is derived by joining against `matches`: a team is returned when it played on either side of at least one stored match in that league. An unsupported or missing league returns `400`.

```json
{
  "league": "PL",
  "teams": [
    {
      "id": 57,
      "name": "Arsenal FC",
      "shortName": "Arsenal",
      "tla": "ARS",
      "crest": "https://crests.football-data.org/57.png",
      "updatedAt": "2026-09-20T19:23:56.791Z"
    }
  ]
}
```

### `GET /api/matches?league=`

`league` is one of `PL`, `PD`, `BL1`, `SA`, `FL1`. Returns the league's **current** matchday (the latest one that already kicked off, so an in-progress matchday keeps its played, live and remaining fixtures) and the **next** one. Each match embeds its `homeTeam` and `awayTeam`, so a fixture list needs no extra request. `currentMatchday` is `null` before the season starts and `nextMatchday` is `null` once it is over; `matchdays` only contains the matchdays that exist. An unsupported or missing league returns `400`.

```json
{
  "league": "PL",
  "currentMatchday": 3,
  "nextMatchday": 4,
  "matchdays": [
    {
      "matchday": 3,
      "matches": [
        {
          "id": 500,
          "league": "PL",
          "utcDate": "2026-09-20T19:30:00Z",
          "status": "IN_PLAY",
          "matchday": 3,
          "winner": null,
          "duration": "REGULAR",
          "fullTimeHome": 1,
          "fullTimeAway": 0,
          "halfTimeHome": 1,
          "halfTimeAway": 0,
          "updatedAt": "2026-09-20T19:45:00.000Z",
          "homeTeam": { "id": 57, "name": "Arsenal FC", "shortName": "Arsenal", "tla": "ARS", "crest": "https://crests.football-data.org/57.png" },
          "awayTeam": { "id": 61, "name": "Chelsea FC", "shortName": "Chelsea", "tla": "CHE", "crest": "https://crests.football-data.org/61.png" }
        }
      ]
    },
    { "matchday": 4, "matches": [] }
  ]
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

`home` and `away` are team ids. `date` is optional: when given, it is the ISO kickoff to analyze against; when omitted, the server resolves the real fixture between the two teams (the next one still to be played, otherwise the most recent one already played) and uses its date. The three signals are returned as separate objects and are never fused into a single score. Invalid or missing `home`/`away` return `400`.

```json
{
  "homeTeamId": 1,
  "awayTeamId": 2,
  "matchDate": "2026-04-01T15:00:00Z",
  "fixture": {
    "id": 500,
    "league": "PL",
    "utcDate": "2026-04-01T15:00:00Z",
    "status": "FINISHED",
    "matchday": 30,
    "homeTeamId": 1,
    "awayTeamId": 2,
    "winner": "HOME_TEAM",
    "duration": "REGULAR",
    "fullTimeHome": 2,
    "fullTimeAway": 1,
    "halfTimeHome": 1,
    "halfTimeAway": 0,
    "updatedAt": "2026-04-01T17:00:00.000Z"
  },
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
  "schedule": {
    "home": { "teamId": 1, "upcomingMatchDate": "2026-04-01T15:00:00Z", "windowDays": 14, "threshold": 3, "matchesInWindow": 2, "congested": false, "daysSinceLastMatch": 4.2, "matches": [{ "matchId": 37, "utcDate": "2026-03-28T15:00:00Z", "daysBefore": 4.2, "venue": "HOME" }] },
    "away": { "teamId": 2, "upcomingMatchDate": "2026-04-01T15:00:00Z", "windowDays": 14, "threshold": 3, "matchesInWindow": 3, "congested": true, "daysSinceLastMatch": 2.8, "matches": [] }
  }
}
```

`fixture` is `null` when the two teams have no meeting on record (past or future) in the synced leagues. When a signal lacks enough history, it says so explicitly instead of guessing: `form.weightedScore` is `null` with zero matches analyzed.

There used to be a fourth signal, head-to-head: it only ever had the current season's locally synced matches to work with, and since two teams in the same league meet at most twice a season, it was below its own minimum in essentially every real case. An attempt to enrich it with football-data.org's cross-season `/matches/{id}/head2head` endpoint was removed after that endpoint turned out to both miss real meetings and silently mix in matches from other competitions (cups, continental) — not reliable enough to show as fact, and not useful enough to keep as a signal that (almost) always said "not enough data."

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

Tests are written with Vitest and Supertest and live in `__tests__/` folders next to each module, with shared fixtures under `src/test/fixtures/`. Run them with:

```bash
pnpm test
```

## Related documentation

- [Root README](../README.md)
- [Client README](../client/README.md)
