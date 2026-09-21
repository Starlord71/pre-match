# Pre-match

**[English](README.md) | [Español](README.es.md)**

<p align="center">
  <img src="docs/images/explorer.png" alt="Pre-match explorer: league and team selectors above the live matchday panel" width="760">
</p>

Pre-match is a single-user, local tool that turns a football league's stored match history into a
small set of **context signals a human interprets** — not a raw dump of statistics. It covers the
five major domestic leagues — Premier League (`PL`), La Liga (`PD`), Bundesliga (`BL1`), Serie A
(`SA`) and Ligue 1 (`FL1`) — and focuses
on the question a fan actually asks before kickoff: what does each team bring into this game?

It runs **without authentication**: there are no accounts and no per-user server state. Everything
that must survive a reload — language, favorite team, followed matches — lives in the browser. The
backend keeps durable match history in SQLite, caches raw football-data.org payloads with a TTL, and
pushes live score and state changes over Socket.io, polling the external API only while a match is
actually in play.

## Requirements

- Node.js (LTS).
- [pnpm](https://pnpm.io/) `11.3.0` (pinned via `packageManager` in `package.json`).
- A free [football-data.org](https://www.football-data.org/) API key — **optional**. Without one,
  the server generates a demo Premier League dataset on first run (a banner in the UI makes this
  obvious), so there is always something to explore. With one, syncing and live polling pull real
  data instead, and any leftover demo data is removed automatically.
- [Docker](https://docs.docker.com/get-docker/) (optional) to run the packaged single-container image.

## Build, test and run

```bash
# 1. Install dependencies for both packages
pnpm install

# 2. Run the API and the client together in development
pnpm dev
```

`pnpm dev` starts both processes at once: the API on `http://localhost:3000` and the client on
`http://localhost:5173`. It uses `concurrently -k`, so when one process exits the other is stopped
too. Use `pnpm dev:server` or `pnpm dev:client` to run only one of them.

No `FOOTBALL_DATA_API_KEY` is needed for this: with none configured, the server seeds a demo Premier
League dataset (past results, a live match and an upcoming matchday) the first time it starts against
an empty database, and the explorer shows a banner saying so. To sync real data from football-data.org
instead:

```bash
# The scripts run with cwd set to server/, so dotenv reads server/.env, not the root .env
cp server/.env.example server/.env
# edit server/.env and set FOOTBALL_DATA_API_KEY, then restart pnpm dev
```

Restarting with a key configured removes the demo data automatically; pick a league in the explorer
and click "Refresh data" (or `POST /api/sync/:league`) to populate it for real.

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the API and the client together. |
| `pnpm dev:server` / `pnpm dev:client` | Start only the API (watch mode) or only the client. |
| `pnpm test` | Run the server test suite. |
| `pnpm --filter client test` | Run the client test suite. |
| `pnpm lint` | Lint every package. |

### Docker

The whole app also runs as a **single container**: Express serves the built React client, so there
is no Nginx, and the SQLite database lives in a named volume so it survives restarts.

```bash
# 1. Create the environment file Compose reads (it is gitignored)
cp .env.example .env

# 2. Build the image and start the app
docker compose up --build
```

The app is then served from `http://localhost:${PORT}` (`3000` by default). Migrations run
automatically on startup, and with no `FOOTBALL_DATA_API_KEY` set in `.env` a fresh volume seeds the
same demo Premier League dataset described above — nothing else to do, the explorer is populated
right away. To sync real data instead, edit `.env`, set `FOOTBALL_DATA_API_KEY` and restart; the demo
data is removed automatically, and "Refresh data" per league in the explorer (or `POST /api/sync/:league`)
populates it for real.

| Command | Description |
| --- | --- |
| `docker compose up --build` | Build the image and run the API plus the client build on `PORT`. |
| `docker compose down` | Stop the container; the SQLite volume is kept. |
| `docker compose down -v` | Stop the container and delete the stored database. |

## Screenshots

| Explorer | Analysis | Favorite team |
| --- | --- | --- |
| ![Explorer with the live matchday panel](docs/images/explorer.png) | ![Match analysis with the fixture banner and the three signal cards](docs/images/analysis.png) | ![Favorite team modal listing every match of the chosen team](docs/images/favorite-modal.png) |

### Explorer

Pick a league and two teams. The league uses a native select and both teams use a searchable
selector (`react-select`), so a long team list can be filtered by typing with full keyboard and
screen-reader support. Below the form, the live panel lists the league's **current matchday** —
the latest one that already started, so its played, live and remaining fixtures are all shown —
with a toggle to the next matchday. Fixtures are grouped by calendar day and ordered by kickoff,
and any number of them can be followed at once.

### Analysis

The analysis view renders the three signals as **separate cards** and never merges them into a
single score: **Recent form** (exponentially weighted, more recent matches weigh more), **Home vs
away** (each team's season record in the venue this game is played in, with its league position) and
**Schedule congestion** (matches played in the 14 days before kickoff). A banner at the top shows the
**real fixture** the backend resolved between the two teams — its status, date and matchday, or a
clear message when the two have no meeting on record.

### Favorite team

Save one favorite team and it follows along everywhere. The modal lists every stored match of that
team, played and upcoming, as a grid of cards, with a **Change team** button that reopens the
selectors pre-filled. The explorer shows a compact banner with the team's live-or-next match, and a
background watcher auto-subscribes to that match, so its updates play a sound (and an opt-in desktop
notification) without following it by hand.

## Architecture

The server keeps a strict request flow — `routes/` → `controllers/` → `services/` →
`repositories/` — so only the repositories touch SQL and only `external/` talks to
football-data.org. The client mirrors that discipline: components never call `fetch` or
`socket.io-client` directly, pages orchestrate hooks, hooks consume services, and services build the
requests.

| Project | Stack | Purpose |
| --- | --- | --- |
| `server` | Node.js, Express, better-sqlite3, Socket.io, Zod, Vitest + Supertest | REST API, SQLite history and cache, football-data.org client with a rate limiter, the three-signal analysis engine and the live-update poller and sockets. |
| `client` | React 19, Vite 8, i18next, socket.io-client, Vitest + Testing Library | Responsive bilingual web UI: explorer, analysis cards, live panel, favorite team. |
| Tooling | pnpm workspaces, Vitest, Oxlint | One install for both packages, a test runner per package and a fast linter. |

The full architecture diagram, the sequence diagrams for sync/analysis/live updates/favorite team,
and every screenshot used on this page live in [`docs/diagrams`](docs/diagrams/README.md) and
[`docs/images`](docs/images).

## Technical decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Language | Plain JavaScript (ESM + JSX), no TypeScript | Keeps the project small and dependency-light. Zod validates every boundary and JSDoc documents the signatures, which is enough for a codebase this size. |
| Persistence | SQLite with two separated concerns: durable `teams` / `matches` history and an ephemeral `api_cache` with a TTL | A stale cache can never become the source of truth, and the durable history is what the analysis engine reads. |
| Analysis output | Three signals returned side by side, never fused | The tool informs a human judgement; merging the signals would hide when they disagree and imply a prediction it cannot make. |
| SQLite driver | `better-sqlite3` | Synchronous, fast and transactional, with no async ceremony for simple local queries. |
| Real time | Socket.io plus polling bounded to the live window | WebSockets push updates to per-match rooms, and the server only calls football-data.org while a stored match is actually live, staying inside the free-tier rate limit. |
| Repository layout | pnpm workspaces (`server`, `client`) | One install and shared root scripts, while each package stays independently runnable and testable. |
| i18n | i18next with both locale bundles imported statically and the choice persisted in `localStorage` | Switching is instant and synchronous (no fetch, no Suspense), and the preference survives a reload. |
| Responsive design | Mobile-first CSS | The explorer and the analysis are used on phones; signal cards, the live panel and the modal reflow instead of overflowing. |
| Head-to-head | Removed as a signal | It almost never had enough data, and the external cross-season endpoint was not reliable enough to show as fact. See [`docs/scope.md`](docs/scope.md). |
| Goalscorers and cards | Not shown | The football-data.org endpoints the backend consumes do not provide them, so there is nothing to derive them from. |

## Project structure

```text
pre-match/
├── Dockerfile                       # Multi-stage build: client build + Express runtime
├── docker-compose.yml               # One service, published port and persistent SQLite volume
├── server/                          # Express API (Node.js, ESM)
│   └── src/
│       ├── server.js                # Entry point: HTTP server + Socket.io + live poller
│       ├── app.js                   # Builds the Express app (middleware + routes)
│       ├── config/env.js            # Centralized environment configuration
│       ├── routes/                  # health, teams, matches, sync, analysis
│       ├── controllers/             # Validate the request and shape the response
│       ├── services/
│       │   ├── sync.service.js      # Cache-or-API sync into SQLite
│       │   ├── livePoller.service.js# Polls only matches inside their live window
│       │   ├── demoSeed.service.js  # Generates/purges the demo dataset
│       │   └── analysisEngine/      # form, homeAway, schedule, fixture, standings
│       ├── repositories/            # teams, matches, cache (the only SQL)
│       ├── db/                      # Lazy connection + migration runner and 001_init.sql
│       ├── external/                # football-data.org client + rate limiter
│       ├── schemas/                 # Zod: league, team, match, analysis, externalApi
│       └── sockets/                 # liveMatches (rooms + match:update)
└── client/                          # React 19 + Vite 8
    └── src/
        ├── main.jsx                 # Initializes i18n and mounts <App />
        ├── App.jsx                  # Shell, routes, favorite modal + live watcher
        ├── pages/                   # ExplorerPage, AnalysisPage
        ├── components/              # Signal cards, live panel, favorite modal and banner
        ├── hooks/                   # Data hooks + the favorite-team context
        ├── services/                # Pure fetch / socket wrappers
        ├── i18n/                    # i18next config + es/en locale bundles
        ├── utils/                   # Matchday grouping, date formatting, helpers
        └── constants/               # Supported leagues, live statuses
```

Each package has its own README with the API reference and the client details:
[`server/README.md`](server/README.md) and [`client/README.md`](client/README.md).

## Testing

Vitest runs both suites. Tests live in `__tests__/` folders next to each module, with shared fixtures
under each package's `test/` folder.

- **`server` — 131 tests across 20 files:** the repositories against a throwaway SQLite file, the
  analysis engine's signals and fixture resolution, the sync service, the demo dataset generator and
  purge, the live poller under fake timers, the Socket.io handlers, the rate limiter and the Express
  routes with Supertest.
- **`client` — 143 tests across 30 files:** components, hooks, services, i18n and the end-to-end
  flows (league → teams → the three analysis cards; follow a match and receive a live update without
  a refetch; language switching; and the favorite-team modal including the back-to-modal flow).

```bash
pnpm test                    # server
pnpm --filter client test    # client
```

## Status

All planned phases are complete: the application functionality (phases 1-5 and 8) is covered by the
test suites, and phase 7 packages the whole app as a single Docker image.

- **Explorer and analysis** work end to end: pick a league and two teams, get the real resolved
  fixture and the three independent signals as separate cards.
- **Live tracking** pushes score and state changes over Socket.io, with the poller bounded to the
  live window and per-match rooms.
- **i18n** switches between Spanish and English instantly and persists the choice.
- **Favorite team** has its modal, its explorer banner and automatic live following.
- **Docker packaging** serves the built client from Express in one container, runs migrations on
  startup and keeps the SQLite database in a named volume.
- **Demo dataset** seeds automatically when no `FOOTBALL_DATA_API_KEY` is configured, and is removed
  automatically the moment a real one is — the two never coexist.

## License

TBD — _WIP_.
