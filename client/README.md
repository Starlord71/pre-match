# Pre-match — Client (Web)

[English](README.md) | [Español](README.es.md)

Web client for the pre-match analysis tool.

> **Status:** all phases implemented. The UI is responsive (mobile-first), bilingual (ES/EN with instant switching), consumes the API through pure service wrappers and hooks, renders the three analysis signals as separate cards and lists a league's current matchday, with a toggle to the next one, following several matches live over Socket.io. A favorite team can be saved from a modal that never leaves the explorer, with an explorer banner and automatic live following. A banner also shows when the backend is serving its generated demo dataset instead of real data.

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
    ├── hooks/            # useTeams, useMatches, useTeamMatches, useAnalysis,
    │                     # useLiveMatches, useFollowedMatches, useFavoriteTeam
    ├── components/       # Presentational components, signal cards, the favorite
    │                     # team modal/banner/watcher
    ├── pages/            # Explorer and analysis pages
    ├── utils/            # Pure helpers (matchday grouping and date formatting)
    ├── i18n/             # i18next config + es/en locales
    ├── constants/        # Supported leagues
    ├── test/             # Test setup and shared fixtures
    ├── __tests__/        # Integration flows (Vitest + Testing Library)
    └── assets/           # Images and icons
```

Unit tests live in `__tests__/` folders next to each module (`components/__tests__`, `hooks/__tests__`, `services/__tests__`, `utils/__tests__`, `i18n/__tests__`).

Components never call `fetch`/`socket.io-client` directly: pages orchestrate hooks, hooks consume services, and services build the requests. This keeps every layer testable in isolation.

## Explorer

The explorer form picks a league and two teams. The league uses a native select; both teams use a searchable selector built on `react-select`, so long team lists can be filtered by typing with full keyboard and screen-reader support.

## Live tracking

The explorer's live panel shows the selected league's **current matchday** by default (the latest one that already started, so its played, live and remaining fixtures are all shown), headed by the matchday number and its date range. A **View next matchday** button swaps the list to the next matchday and back. Inside a matchday, fixtures are grouped by calendar day and ordered by kickoff, and each card highlights the score. The league comes from the explorer selector, so the panel has no selector of its own; changing league remounts it and clears the followed matches. Any number of matches can be followed at once, and their status and score update over Socket.io without a reload.

## Favorite team

`useFavoriteTeam` exposes a `FavoriteTeamProvider` context (team + the modal's open/closed state)
shared by the header button, `FavoriteTeamModal`, `FavoriteNextMatchBanner` and the analysis page's
back link — no page or route change of its own. Saving a team keeps it in `localStorage`; opening
the modal without one saved shows the same league/team selectors as the explorer, and "Change team"
reopens them pre-filled without losing the current favorite until a new one is actually saved. Two
things stay in sync with it in the background: `FavoriteNextMatchBanner` shows the team's live-or-next
match on the explorer, and `FavoriteLiveWatcher` (mounted once in `App.jsx`) auto-subscribes to that
same match over Socket.io, so its updates play a sound (and an opt-in desktop notification) without
following it by hand. Opening a match from inside the modal closes it and carries `state.reopenFavorite`,
so clicking "Back" from the analysis page reopens the modal instead of landing on a bare explorer.

## Configuration

- **Dev server:** Vite defaults (`http://localhost:5173`).
- **API base URL:** `VITE_API_URL` (default `http://localhost:3000`), read in `src/services/http.js`. The server enables CORS, so no dev proxy is needed.
- **Language:** both locale bundles are imported statically and i18next initializes synchronously; the choice is persisted in `localStorage` under `preferredLanguage`.
- **Favorite team:** persisted under `favoriteTeam`; a one-time header hint suggesting to pick one is dismissed for good (`favoriteHintDismissed`) once opened or closed. Desktop notifications for live updates are opt-in and persisted under `notificationsEnabled`, shared by the live panel and the favorite team's auto-follow.
- **Demo data banner:** `useDemoData` reads `GET /health` once on load; `DemoDataBanner` shows a dismissible (session-only, not persisted) notice while the backend's `demoData` flag is `true`.

## Related documentation

- [Root README](../README.md)
- [Server README](../server/README.md)
