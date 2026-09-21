# Sincronización y caché

Secuencia de `POST /api/sync/:league`, el único camino de escritura para los datos de
football-data.org. Una liga se sirve desde la tabla `api_cache` cuando existe una entrada fresca; si
no, el cliente consulta football-data.org a través del rate limiter compartido. En ambos casos el
payload se valida con Zod al salir — los datos cacheados nunca se confían a ciegas — y luego se hace
upsert en `teams` y `matches`.

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

    alt liga no soportada o ausente
        Ctrl-->>User: 400 Unsupported league
    else liga válida
        Ctrl->>Svc: syncLeague(league)
        Svc->>Svc: migrate()
        Svc->>Cache: get("football-data:competitions:{league}:matches")

        alt entrada de caché fresca
            Cache->>DB: SELECT payload, expires_at
            DB-->>Cache: fila dentro de su TTL
            Cache-->>Svc: payload parseado
            Note over Svc: source = "cache"
        else fallo o vencida
            Cache->>DB: SELECT payload, expires_at
            DB-->>Cache: sin fila o fila vencida
            Cache->>DB: DELETE fila vencida
            Cache-->>Svc: null
            Svc->>Client: getCompetitionMatches(league)
            Client->>Limiter: schedule(task)
            Note over Limiter: como máximo 10 peticiones en una ventana móvil de 60s
            Limiter->>API: GET /v4/competitions/{league}/matches
            API-->>Limiter: payload JSON
            Limiter-->>Client: payload JSON
            Client->>Client: externalMatchesResponseSchema.parse(payload)
            Client-->>Svc: payload validado
            Note over Svc: source = "api"
            Svc->>Cache: set(key, payload, 3600s)
            Cache->>DB: INSERT ... ON CONFLICT(key) DO UPDATE
        end

        Svc->>Svc: externalMatchesResponseSchema.parse(payload)
        Svc->>Svc: collectTeams(matches) — únicos por id

        Svc->>Teams: upsertMany(teams)
        Teams->>DB: INSERT ... ON CONFLICT(id) DO UPDATE (una transacción)
        Svc->>Matches: upsertMany(matches.map(toMatchRow))
        Matches->>DB: INSERT ... ON CONFLICT(id) DO UPDATE (una transacción)

        Svc-->>Ctrl: { league, source, teams, matches }
        Ctrl-->>User: 200 resumen
    end
```

Puntos clave:

- La clave de caché es `football-data:competitions:{league}:matches`, con un TTL de una hora
  (`SYNC_TTL_SECONDS`).
- Solo se cachea una consulta de red; un acierto de caché igual se revalida y se vuelve a hacer
  upsert, así que un payload guardado que ya no coincide con el schema falla ruidosamente en vez de
  envenenar la base de datos en silencio.
- `teams` y `matches` se escriben cada una en una sola transacción vía `better-sqlite3`, indexadas
  por el id de football-data.org, así que re-sincronizar actualiza filas en su lugar en vez de
  duplicarlas.
