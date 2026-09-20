# Pre-match — Server (API)

[English](README.md) | [Español](README.es.md)

Backend API for the pre-match analysis tool.

> **Status:** early development. Only the health check endpoint is implemented; the rest is marked as _WIP_.

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
└── src/
    ├── server.js          # Entry point: creates the HTTP server
    ├── app.js             # Builds the Express app (middleware + routes)
    ├── config/            # Environment configuration
    │   └── env.js
    ├── routes/            # Express routers
    │   └── health.routes.js
    ├── controllers/       # Request handlers
    │   └── health.controller.js
    ├── schemas/           # Zod schemas (domain model)
    │   ├── league.schema.js
    │   ├── match.schema.js
    │   └── team.schema.js
    ├── services/          # Business logic                      (WIP)
    ├── repositories/      # Data access / SQLite queries        (WIP)
    ├── db/migrations/     # Database migrations                 (WIP)
    ├── external/          # football-data.org API client        (WIP)
    └── sockets/           # Socket.io handlers                  (WIP)
```

`app.js` is kept separate from `server.js` so the Express app can be imported in tests without opening a network port.

## API

Base URL: `http://localhost:3000` (configurable via `PORT`).

| Method | Path      | Description           | Status |
| ------ | --------- | --------------------- | ------ |
| `GET`  | `/health` | Service health status | Done   |

### `GET /health`

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Unknown routes return `404 { "error": "Not Found" }`. Errors are handled by a central error middleware returning `{ "error": "<message>" }`.

> Routes for leagues, teams and matches are _WIP_.

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
