# AGENTS.md

## Commands

Always use pnpm (pinned to 11.3.0 via `packageManager`), never npm/yarn.

- Install: `pnpm install` (from root)
- Dev API: `pnpm dev` (alias `pnpm dev:server`)
- Dev client: `pnpm dev:client`
- Tests: `pnpm test` (runs only the `server` suite)
- Single test file: `pnpm --filter server exec vitest run <path>`
- Lint all: `pnpm lint` (server runs `node --check src/server.js` only, not a real linter; client runs Oxlint)

No test files exist yet. `pnpm test` uses Vitest; integration tests use Supertest against the app from `src/app.js`.

## Monorepo layout

pnpm workspace with two packages: `server` (Express API) and `client` (React 19 + Vite 8). Root scripts are filters, not a build pipeline.

## Server (backend)

- `src/app.js` builds the Express app; `src/server.js` only opens the port. Keep this split so tests can import the app without listening.
- Request flow: `routes/` -> `controllers/` -> `services/` -> `repositories/`. External API clients go in `external/`, realtime handlers in `sockets/`, migrations in `db/migrations/`. `services/`, `repositories/`, `db/migrations/`, `external/` and `sockets/` are currently empty placeholders.
- Domain validation lives in Zod schemas under `src/schemas/` (`league`, `team`, `match`).
- The package is ESM (`"type": "module"`); local imports must include the `.js` extension.
- Env vars are centralized in `src/config/env.js` via dotenv. The scripts run with cwd set to `server/`, so dotenv reads `server/.env`, not the root `.env`.

## Conventions

- Code comments: always in English.
- Documentation: bilingual. Each doc is a pair (`README.md` + `README.es.md`) with cross-links; keep both in sync.
- Respect the layered architecture and keep responsibilities separated.
- No over-engineering; make the minimal change that fits.
- Tests must pass before considering work done.
- Do not commit or push unless explicitly asked. Commit messages: short, one line, in English.

## Sign-off

Always end every reply with the phrase: `Say my name`

Context: the user wants it as a running catchphrase, echoing the line Walter White says in Breaking Bad. Add it literally and verbatim as the last line of the reply, every time.
