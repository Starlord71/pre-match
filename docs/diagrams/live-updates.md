# Live updates

End-to-end real time. The client subscribes to the matches it follows over Socket.io; an independent
poller on the server only calls football-data.org while a stored match is inside its live window
(kickoff - 10 min → kickoff + 2 h). Detected changes are persisted and broadcast to the match's
room, and the client merges the update into the rendered row without refetching the list.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Panel as LiveMatchesPanel
    participant Hook as useLiveMatches
    participant Svc as sockets.service
    participant IO as Socket.io server
    participant Poller as livePoller.service
    participant Repo as matches.repository
    participant Client as footballData.client
    participant Limiter as rateLimiter
    participant API as football-data.org

    User->>Panel: click "Follow" on a match
    Panel->>Hook: useLiveMatches([id], { onUpdate })
    Hook->>Svc: subscribeToMatches([id], onUpdate)
    Svc->>IO: emit "subscribe:match" id
    IO->>IO: socket.join("match:{id}")
    IO-->>Svc: ack { ok: true, room }

    loop every 60-90s (default 75s)
        Poller->>Repo: findByKickoffRange(now - 2h, now + 10min)
        Repo-->>Poller: stored matches inside a live window

        alt no match inside a live window
            Note over Poller: tick returns early — no external request
        else at least one match in window
            Poller->>Poller: unique leagues of those matches
            loop per league
                Poller->>Client: getCompetitionMatches(league)
                Client->>Limiter: schedule(task)
                Note over Limiter: at most 10 requests in a moving 60s window
                Limiter->>API: GET /v4/competitions/{league}/matches
                API-->>Limiter: payload
                Limiter-->>Client: payload
                Client->>Client: externalMatchesResponseSchema.parse(payload)
                Client-->>Poller: validated matches
                loop per match inside its live window
                    Poller->>Poller: isLiveWindowOpen and hasChanged
                    alt state or score changed
                        Poller->>Repo: upsert(row)
                        Poller->>IO: emit(row, previous)
                        IO->>IO: io.to("match:{id}").emit("match:update", row)
                    else unchanged
                        Note over Poller: skipped, nothing to broadcast
                    end
                end
            end
        end
    end

    IO-->>Svc: match:update row
    Svc-->>Hook: onUpdate(row)
    Hook->>Hook: updatesById = { ...prev, [row.id]: row }
    Hook-->>Panel: re-render with the new status/score
    Note over Panel: useMatches is not called again — the REST payload<br/>is merged with the live update, not refetched
```

Key points:

- Each match is a room (`match:{id}`), so a subscriber only receives events for the matches it asked
  for. The `subscribe:match` / `unsubscribe:match` events accept an optional ack with
  `{ ok: true, room }` or `{ ok: false }` for an invalid id.
- Polling is bounded to the live window: with no match in play the poller performs no external
  request at all. All requests go through the shared rate limiter (≤ 10 per minute).
- A single league failing (network hiccup, rate limit, invalid payload) never aborts the other
  leagues in the same tick — failures are isolated per league and reported through `onError`.
- Only state or score changes are persisted and emitted (`hasChanged`), so an unchanged poll is
  silent.
- The same mechanism powers the favorite team's automatic follow-up: `FavoriteLiveWatcher` subscribes
  to the favorite team's current-or-next match and plays a sound (plus an opt-in desktop
  notification) on every update.
