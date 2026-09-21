# Equipo favorito

El equipo favorito es una opción extra sobre el explorador, no una ruta. Un único contexto de React
(`FavoriteTeamProvider` en `hooks/useFavoriteTeam.js`) posee el equipo y el estado de
abierto/cerrado de su modal, así que el botón del header, el propio modal, el banner del explorador,
el observador en vivo y el link de "Volver" de la vista de análisis leen y cambian el mismo estado.
El equipo se persiste en `localStorage`; el estado del modal no.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Provider as FavoriteTeamProvider
    participant Header as Header
    participant Modal as FavoriteTeamModal
    participant Storage as localStorage
    participant Banner as FavoriteNextMatchBanner
    participant Watcher as FavoriteLiveWatcher
    participant TeamMatches as useTeamMatches
    participant API as GET /api/matches/team/:id
    participant Analysis as AnalysisPage
    participant IO as Socket.io

    Note over Provider: contexto compartido por el header, el modal, el banner, el observador y el link de volver del análisis

    User->>Header: click en el botón de favorito
    Header->>Provider: openModal()
    Provider-->>Modal: modalOpen = true

    alt sin favorito guardado todavía
        Modal->>User: selectores de liga + equipo
        User->>Modal: elige un equipo y click en "Guardar como favorito"
        Modal->>Provider: setFavoriteTeam({ league, teamId, teamName })
        Provider->>Storage: setItem("favoriteTeam", ...)
    else favorito guardado / "Cambiar equipo"
        Modal->>User: grilla de partidos con un botón "Cambiar equipo"
        opt cambiar de equipo
            Modal->>User: selectores prellenados con la elección actual
            Note over Modal: el favorito anterior sigue activo hasta que se guarda uno nuevo
        end
    end

    Provider-->>Modal: favoriteTeam
    Modal->>TeamMatches: useTeamMatches(teamId, league)
    TeamMatches->>API: GET /api/matches/team/:id?league=
    API-->>TeamMatches: partidos jugados + pendientes (con ambos equipos embebidos)
    TeamMatches-->>Modal: grilla de dos columnas de tarjetas de partido

    par Observadores siempre activos en segundo plano
        Provider-->>Banner: favoriteTeam
        Banner->>TeamMatches: useTeamMatches(teamId, league)
        Banner->>Banner: findCurrentOrNextMatch(matches)
        Banner-->>User: banner del partido en vivo o próximo en el explorador
    and
        Provider-->>Watcher: favoriteTeam
        Watcher->>TeamMatches: useTeamMatches(teamId, league)
        Watcher->>Watcher: findCurrentOrNextMatch(matches)
        Watcher->>IO: useLiveMatches([match.id]) se suscribe a match:{id}
        IO-->>Watcher: match:update
        Watcher->>User: reproduce un sonido (y una notificación opcional)
    end

    User->>Modal: click en un partido
    Modal->>Provider: closeModal()
    Modal->>Analysis: navigate("/match/:league/:home/:away", { state: { reopenFavorite: true } })
    Note over Analysis: corre el flujo normal de análisis para el partido elegido
    User->>Analysis: click en "Volver"
    Analysis->>Provider: openModal() (desde el click, leyendo location.state.reopenFavorite)
    Provider-->>Modal: modalOpen = true — se reabre el modal en vez de un explorador vacío
```

Puntos clave:

- **Contexto compartido, no un hook por consumidor.** El estado del favorito debe ser idéntico
  para el botón del header, el modal, el banner, el observador y el link de volver del análisis,
  así que vive en un contexto en vez de instanciarse por separado en cada uno.
- **El almacenamiento es best-effort.** Cuando `localStorage` no está disponible (modo privado,
  cuota agotada), el provider degrada a un valor en memoria en vez de romper el render.
- **Auto-seguimiento.** `FavoriteLiveWatcher` se monta una sola vez en `AppShell`, no dentro de una
  página, así que el partido del equipo favorito se sigue sin importar la ruta activa. Suscribirse
  a un partido que todavía no arrancó es inofensivo: el servidor solo emite cuando entra en su
  ventana en vivo.
- **La navegación del banner es el flujo normal.** `FavoriteNextMatchBanner` navega sin
  `state.reopenFavorite`, así que "Volver" se comporta igual que desde cualquier link del
  explorador. Solo un partido abierto desde el modal activa ese flag.
- **Soporte de teclado.** El modal atrapa Tab/Shift+Tab dentro del panel y cierra con Escape, así
  el foco nunca se escapa hacia el explorador de fondo.
