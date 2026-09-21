# Pre-match

[English](README.md) | [Español](README.es.md)

Pre-match analysis tool for upcoming football matches.

> **Status:** phases 1-5 of the plan are implemented and covered by tests; Docker packaging (phase 7) is pending.

## Overview

This monorepo holds the backend API and the web client of a tool that helps analyze football matches before they are played.

## Current status

- **Done (server):** Express API, SQLite with migrations and cache, football-data.org client with rate limiting, league sync (`POST /api/sync/:league`), the teams endpoint (`GET /api/teams?league=`), the current and next matchday (`GET /api/matches?league=`), the three-signal analysis engine plus real-fixture resolution (`GET /api/analysis`) and live match updates over Socket.io.
- **Done (client):** React UI (responsive + ES/EN i18n) that lists a league's teams, shows the three signals as separate cards and follows live matches over Socket.io.
- **Pending:** Docker packaging (phase 7).
- **API reference:** see [`server/README.md`](server/README.md).

## Project structure

```
pre-match/
├── server/   # Backend API (Express + SQLite + Socket.io)
└── client/   # Web client (React + Vite)
```

- See [`server/README.md`](server/README.md) for the API documentation.
- See [`client/README.md`](client/README.md) for the web client documentation.

## Tech stack

| Package  | Stack                                                    |
| -------- | -------------------------------------------------------- |
| `server` | Node.js, Express, better-sqlite3, Socket.io, Zod         |
| `client` | React 19, Vite                                          |
| Tooling  | pnpm workspaces, Vitest, Oxlint                          |

## Requirements

- Node.js (LTS)
- [pnpm](https://pnpm.io/) `11.3.0` (pinned via `packageManager` in `package.json`)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the environment
cp .env.example .env
# edit .env and fill in the required values

# 3. Start the API and the client together in development mode
pnpm dev
```

`pnpm dev` runs both processes at once: the API on `http://localhost:3000` and the web client on `http://localhost:5173`. It is implemented with `concurrently -k`, so when one process exits the other is stopped too, avoiding orphan processes. Use the per-package scripts below to run only one of them.

## Root scripts

| Script                      | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `pnpm dev`                  | Start the API and the client together          |
| `pnpm dev:server`           | Start only the API (watch mode) on `:3000`     |
| `pnpm dev:client`           | Start only the client dev server (Vite) on `:5173` |
| `pnpm test`                 | Run the server test suite                      |
| `pnpm --filter client test` | Run the client test suite                      |
| `pnpm lint`                 | Lint every package                             |

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable                | Description                              | Default                     |
| ----------------------- | ---------------------------------------- | --------------------------- |
| `PORT`                  | HTTP port of the API                     | `3000`                      |
| `NODE_ENV`              | Runtime environment                      | `development`               |
| `FOOTBALL_DATA_API_KEY` | API key for football-data.org            | —                           |
| `DB_PATH`               | Path to the SQLite database file         | `./data/prematch.sqlite`    |

## License

TBD — _WIP_.
