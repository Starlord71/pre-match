# Sync and cache

Sequence of `POST /api/sync/:league`, the only write path for football-data.org data. A league is
served from the `api_cache` table when a fresh entry exists; otherwise the client fetches from
football-data.org through the shared rate limiter. Either way the payload is validated with Zod on
the way out — cached data is never trusted blindly — and then upserted into `teams` and `matches`.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Ctrl as sync.controller
    participant Svc as sync.service
    participant Cache as cache.repository
    participant Client as footballData.client
    participant Limiter as rateLimiter
    participant API as football-data.org
    participant Teams as teams.repository
    participant Matches as matches.repository
    participant DB as SQLite

    User->>Ctrl: POST /api/sync/:league
    Ctrl->>Ctrl: LeagueCode.safeParse(league)

    alt unsupported or missing league
        Ctrl-->>User: 400 Unsupported league
    else valid league
        Ctrl->>Svc: syncLeague(league)
        Svc->>Svc: migrate()
        Svc->>Cache: get("football-data:competitions:{league}:matches")

        alt fresh cache entry
            Cache->>DB: SELECT payload, expires_at
            DB-->>Cache: row inside its TTL
            Cache-->>Svc: parsed payload
            Note over Svc: source = "cache"
        else miss or expired
            Cache->>DB: SELECT payload, expires_at
            DB-->>Cache: no row or expired row
            Cache->>DB: DELETE expired row
            Cache-->>Svc: null
            Svc->>Client: getCompetitionMatches(league)
            Client->>Limiter: schedule(task)
            Note over Limiter: at most 10 requests in a moving 60s window
            Limiter->>API: GET /v4/competitions/{league}/matches
            API-->>Limiter: JSON payload
            Limiter-->>Client: JSON payload
            Client->>Client: externalMatchesResponseSchema.parse(payload)
            Client-->>Svc: validated payload
            Note over Svc: source = "api"
            Svc->>Cache: set(key, payload, 3600s)
            Cache->>DB: INSERT ... ON CONFLICT(key) DO UPDATE
        end

        Svc->>Svc: externalMatchesResponseSchema.parse(payload)
        Svc->>Svc: collectTeams(matches) — unique by id

        Svc->>Teams: upsertMany(teams)
        Teams->>DB: INSERT ... ON CONFLICT(id) DO UPDATE (one transaction)
        Svc->>Matches: upsertMany(matches.map(toMatchRow))
        Matches->>DB: INSERT ... ON CONFLICT(id) DO UPDATE (one transaction)

        Svc-->>Ctrl: { league, source, teams, matches }
        Ctrl-->>User: 200 summary
    end
```

Key points:

- The cache key is `football-data:competitions:{league}:matches`, with a TTL of one hour
  (`SYNC_TTL_SECONDS`).
- Only a network fetch is cached; a cache hit is still re-validated and re-upserted, so a stored
  payload that no longer matches the schema fails loudly instead of silently poisoning the database.
- `teams` and `matches` are written in a single transaction each via `better-sqlite3`, keyed on the
  football-data.org id, so re-syncing updates rows in place instead of duplicating them.
