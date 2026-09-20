# Pre-match

[English](README.md) | [Español](README.es.md)

Pre-match analysis tool for upcoming football matches.

> **Status:** early development. This README describes the current state of the project; anything not built yet is marked as _WIP_.

## Overview

This monorepo holds the backend API and the web client of a tool that helps analyze football matches before they are played.

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

# 3. Start the API in development mode
pnpm dev
```

## Root scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Start the server in watch mode       |
| `pnpm dev:server` | Start the server in watch mode       |
| `pnpm dev:client` | Start the client dev server (Vite)   |
| `pnpm test`       | Run the server test suite            |
| `pnpm lint`       | Lint every package                   |

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
