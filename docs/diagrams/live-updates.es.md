# Actualizaciones en vivo

Tiempo real de punta a punta. El cliente se suscribe a los partidos que sigue vía Socket.io; un
poller independiente en el servidor solo llama a football-data.org mientras un partido guardado está
dentro de su ventana en vivo (kickoff - 10 min → kickoff + 2 h). Los cambios detectados se persisten
y se difunden a la room del partido, y el cliente fusiona la actualización en la fila renderizada sin
volver a pedir la lista.

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

    User->>Panel: click en "Seguir" sobre un partido
    Panel->>Hook: useLiveMatches([id], { onUpdate })
    Hook->>Svc: subscribeToMatches([id], onUpdate)
    Svc->>IO: emit "subscribe:match" id
    IO->>IO: socket.join("match:{id}")
    IO-->>Svc: ack { ok: true, room }

    loop cada 60-90s (75s por defecto)
        Poller->>Repo: findByKickoffRange(now - 2h, now + 10min)
        Repo-->>Poller: partidos guardados dentro de una ventana en vivo

        alt ningún partido dentro de una ventana en vivo
            Note over Poller: el tick vuelve enseguida — sin petición externa
        else al menos un partido en ventana
            Poller->>Poller: ligas únicas de esos partidos
            loop por liga
                Poller->>Client: getCompetitionMatches(league)
                Client->>Limiter: schedule(task)
                Note over Limiter: como máximo 10 peticiones en una ventana móvil de 60s
                Limiter->>API: GET /v4/competitions/{league}/matches
                API-->>Limiter: payload
                Limiter-->>Client: payload
                Client->>Client: externalMatchesResponseSchema.parse(payload)
                Client-->>Poller: partidos validados
                loop por partido dentro de su ventana en vivo
                    Poller->>Poller: isLiveWindowOpen y hasChanged
                    alt cambió el estado o el marcador
                        Poller->>Repo: upsert(row)
                        Poller->>IO: emit(row, previous)
                        IO->>IO: io.to("match:{id}").emit("match:update", row)
                    else sin cambios
                        Note over Poller: se descarta, nada que difundir
                    end
                end
            end
        end
    end

    IO-->>Svc: fila match:update
    Svc-->>Hook: onUpdate(row)
    Hook->>Hook: updatesById = { ...prev, [row.id]: row }
    Hook-->>Panel: re-renderiza con el nuevo estado/marcador
    Note over Panel: useMatches no se vuelve a llamar — el payload REST<br/>se fusiona con la actualización en vivo, no se vuelve a pedir
```

Puntos clave:

- Cada partido es una room (`match:{id}`), así que un suscriptor solo recibe eventos de los
  partidos que pidió. Los eventos `subscribe:match` / `unsubscribe:match` aceptan un ack opcional
  con `{ ok: true, room }` o `{ ok: false }` para un id inválido.
- El polling está acotado a la ventana en vivo: sin ningún partido en juego, el poller no hace
  ninguna petición externa. Todas las peticiones pasan por el rate limiter compartido (≤ 10 por
  minuto).
- Que una liga falle (un corte de red, rate limit, payload inválido) nunca aborta las demás ligas
  del mismo tick — los fallos se aíslan por liga y se reportan vía `onError`.
- Solo se persisten y emiten los cambios de estado o marcador (`hasChanged`), así que un sondeo sin
  cambios queda en silencio.
- El mismo mecanismo alimenta el auto-seguimiento del equipo favorito: `FavoriteLiveWatcher` se
  suscribe al partido actual o próximo del equipo favorito y reproduce un sonido (más una
  notificación de escritorio opcional) en cada actualización.
