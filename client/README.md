# Pre-match — Client (Web)

[English](README.md) | [Español](README.es.md)

Web client for the pre-match analysis tool.

> **Status:** phases 1-5 implemented. The UI is responsive (mobile-first), bilingual (ES/EN with instant switching), consumes the API through pure service wrappers and hooks, renders the four analysis signals as separate cards and lists a league's current and next matchday, following several matches live over Socket.io. Docker packaging (phase 7) is pending.

## Tech stack

| Concern   | Technology                     |
| --------- | ------------------------------ |
| UI        | React 19                       |
| Build/dev | Vite 8                         |
| i18n      | i18next + react-i18next        |
| Realtime  | socket.io-client               |
| Testing   | Vitest + Testing Library       |
| Linting   | Oxlint                         |
| Language  | JavaScript (ESM), JSX          |

## Requirements

- Node.js (LTS)
- pnpm `11.3.0`

## Scripts

| Script          | Description                                    |
| --------------- | ---------------------------------------------- |
| `pnpm dev`      | Start the Vite dev server with HMR             |
| `pnpm build`    | Build the production bundle into `dist/`       |
| `pnpm preview`  | Preview the production build locally           |
| `pnpm test`     | Run the unit + integration suite once (Vitest) |
| `pnpm lint`     | Run Oxlint                                     |

From the monorepo root you can also use `pnpm dev:client` and `pnpm --filter client test`.

## Project structure

```
client/
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── vitest.config.js      # Vitest configuration (jsdom environment)
├── public/               # Static assets served as-is
└── src/
    ├── main.jsx          # Entry point: initializes i18n, mounts <App />
    ├── App.jsx           # Root component + page navigation
    ├── services/         # Pure fetch / socket wrappers (no React)
    ├── hooks/            # useTeams, useMatches, useAnalysis, useLiveMatches, useLanguage
    ├── components/       # Presentational components and signal cards
    ├── pages/            # Explorer and analysis pages
    ├── utils/            # Pure helpers (matchday grouping and date formatting)
    ├── i18n/             # i18next config + es/en locales
    ├── constants/        # Supported leagues
    ├── test/             # Test setup, fixtures and integration flows
    └── assets/           # Images and icons
```

Components never call `fetch`/`socket.io-client` directly: pages orchestrate hooks, hooks consume services, and services build the requests. This keeps every layer testable in isolation.

## Live tracking

The explorer's live panel lists the selected league's **current matchday** (the latest one that already started, so its played, live and remaining fixtures are all shown) and the **next** one, each headed by the matchday number and its date range. Inside a matchday, fixtures are grouped by calendar day and ordered by kickoff. The league comes from the explorer selector, so the panel has no selector of its own; changing league remounts it and clears the followed matches. Any number of matches can be followed at once, and their status and score update over Socket.io without a reload.

## Configuration

- **Dev server:** Vite defaults (`http://localhost:5173`).
- **API base URL:** `VITE_API_URL` (default `http://localhost:3000`), read in `src/services/http.js`. The server enables CORS, so no dev proxy is needed.
- **Language:** both locale bundles are imported statically and i18next initializes synchronously; the choice is persisted in `localStorage` under `preferredLanguage`.

## Related documentation

- [Root README](../README.md)
- [Server README](../server/README.md)
