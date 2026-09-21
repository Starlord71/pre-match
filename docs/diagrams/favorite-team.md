# Favorite team

The favorite team is an optional extra layered on top of the explorer, not a route. One React
context (`FavoriteTeamProvider` in `hooks/useFavoriteTeam.js`) owns the team and the open/closed
state of its modal, so the header button, the modal itself, the explorer banner, the live watcher
and the analysis page's back link all read and change the same state. The team is persisted in
`localStorage`; the modal state is not.

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

    Note over Provider: context shared by header, modal, banner, watcher and the analysis back link

    User->>Header: click the favorite button
    Header->>Provider: openModal()
    Provider-->>Modal: modalOpen = true

    alt no favorite saved yet
        Modal->>User: league + team selectors
        User->>Modal: pick a team and click "Save as favorite"
        Modal->>Provider: setFavoriteTeam({ league, teamId, teamName })
        Provider->>Storage: setItem("favoriteTeam", ...)
    else favorite saved / "Change team"
        Modal->>User: match grid with a "Change team" button
        opt change team
            Modal->>User: selectors pre-filled with the current pick
            Note over Modal: the previous favorite stays active until a new one is saved
        end
    end

    Provider-->>Modal: favoriteTeam
    Modal->>TeamMatches: useTeamMatches(teamId, league)
    TeamMatches->>API: GET /api/matches/team/:id?league=
    API-->>TeamMatches: played + upcoming matches (both teams embedded)
    TeamMatches-->>Modal: two-column grid of match cards

    par Always-on background watchers
        Provider-->>Banner: favoriteTeam
        Banner->>TeamMatches: useTeamMatches(teamId, league)
        Banner->>Banner: findCurrentOrNextMatch(matches)
        Banner-->>User: live-or-next match banner on the explorer
    and
        Provider-->>Watcher: favoriteTeam
        Watcher->>TeamMatches: useTeamMatches(teamId, league)
        Watcher->>Watcher: findCurrentOrNextMatch(matches)
        Watcher->>IO: useLiveMatches([match.id]) subscribes to match:{id}
        IO-->>Watcher: match:update
        Watcher->>User: play a sound (and an opt-in notification)
    end

    User->>Modal: click a match
    Modal->>Provider: closeModal()
    Modal->>Analysis: navigate("/match/:league/:home/:away", { state: { reopenFavorite: true } })
    Note over Analysis: normal analysis flow runs for the clicked fixture
    User->>Analysis: click "Back"
    Analysis->>Provider: openModal() (from the click, reading location.state.reopenFavorite)
    Provider-->>Modal: modalOpen = true — the modal is reopened instead of a bare explorer
```

Key points:

- **Shared context, not a per-caller hook.** The favorite state must be identical for the header
  button, the modal, the banner, the watcher and the analysis back link, so it lives in one context
  rather than being instantiated separately by each consumer.
- **Storage is best-effort.** When `localStorage` is unavailable (private mode, quota), the provider
  degrades to an in-memory value instead of breaking the render.
- **Auto-follow.** `FavoriteLiveWatcher` is mounted once in `AppShell`, not inside a page, so the
  favorite team's match is followed regardless of the active route. Subscribing to a match that has
  not started yet is harmless: the server only emits once it enters its live window.
- **Banner navigation is the normal flow.** `FavoriteNextMatchBanner` navigates without
  `state.reopenFavorite`, so "Back" behaves like it does from any explorer link. Only a match opened
  from the modal sets that flag.
- **Keyboard support.** The modal traps Tab/Shift+Tab inside the panel and closes on Escape, so
  focus never leaks to the explorer underneath.
