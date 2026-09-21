# Scope

What Pre-match is built to do, and what it deliberately leaves out. The tool is a **single-user,
local pre-match analysis aid**: it turns a league's stored match history into a small set of
**context signals that a human interprets**, never into a single prediction. This document records
the current boundary and the reason behind each exclusion.

## In scope

| Area | What is included |
| --- | --- |
| Competitions | The five domestic leagues supported by football-data.org: Premier League (`PL`), La Liga (`PD`), Bundesliga (`BL1`), Serie A (`SA`) and Ligue 1 (`FL1`). |
| Analysis | Three **independent** signals for a pairing — recent form (exponentially weighted), home/away venue record and schedule congestion — plus the real fixture resolution that anchors them, and each team's league position as supporting context. |
| Fixtures | The league's current and next matchday with their played, live and upcoming matches, and a team's full fixture list (played and upcoming). |
| Live data | Score and state updates over Socket.io. The server polls football-data.org only while a stored match is inside its live window, and broadcasts changes to subscribers. |
| Languages | Spanish and English, switchable at any time and persisted in `localStorage`. |
| Favorite team | One optional favorite team per user, with a modal listing all its matches, an explorer banner for its live-or-next match and automatic live following (sound plus opt-in desktop notification). |
| Persistence | SQLite: `teams` and `matches` as durable history, `api_cache` as an ephemeral TTL cache of raw API payloads. |
| Packaging | A single Docker image: Express serves the built React client directly (no Nginx) and the SQLite database persists in a named volume. |

Delivered so far: **all planned phases (1-8)**, including the single-container Docker packaging of phase 7.

## Out of scope

| Excluded | Why |
| --- | --- |
| Individual player statistics | Pre-match interprets **team-level match history** into context signals; player-level data is a different model. The football-data.org endpoints the backend consumes also do not expose per-player stats for these leagues. |
| Champions League and knockout cups | The model assumes a domestic league season with a matchday calendar and a table built from every finished match. Knockout rounds have neither, so the current/next-matchday and standings logic would not apply. |
| Copa Libertadores and South American leagues | Not among the five supported competition codes, and not covered by the data plan in use. Supporting them would require a separate data source and a different season model, so it is a separate project rather than a flag. |
| Goalscorers and cards | The football-data.org endpoints the backend consumes do not provide them, so there is no data to derive a signal from. |
| Head-to-head | Removed. It only ever had the locally synced matches to work with, and since two teams in the same league meet at most twice a season it fell below its own minimum in essentially every real case. An attempt to enrich it with football-data.org's cross-season `/matches/{id}/head2head` endpoint was dropped because that endpoint **missed real meetings and silently mixed in matches from other competitions** (cups, continental), so it was not reliable enough to show as fact — and not useful enough to keep as a signal that (almost) always said "not enough data". |
| Authentication and multi-user support | By design a single-user, local tool: no accounts, sessions or per-user server state. Anything that must survive a reload (language, favorite team, followed matches) lives in the browser's `localStorage`. |

## Related documentation

- [Architecture](diagrams/architecture.md)
- [Analysis engine](diagrams/analysis-engine.md)
- [Live updates](diagrams/live-updates.md)
- [Favorite team](diagrams/favorite-team.md)
